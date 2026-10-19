// Mocked backend API. Every function behaves like a call to the real NestJS service: it waits
// for a simulated network latency, reads or writes the in-memory database, and is written to
// the API log shown under the phone. The UI imports only from this file (and from phone/phoneApi.js).
import dayjs from 'dayjs';
import { useStore } from './store.js';
import {
  DEPOT, CUSTOMERS, SHIPPERS, TRUCKS, DRIVERS, DISPATCHERS, DEMO_BOL, INSPECTION_ITEMS,
} from './seed.js';
import {
  nearestNeighbourOrder, roadKm, driveMin, routePath, pointAlong, haversineKm, SERVICE_MIN_PER_STOP,
} from './geo.js';
import { toCsv } from './csv.js';

export const DEMO_DRIVER_ID = '1001';

// ------------------------------------------------------------------ plumbing

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = () => useStore.getState();
const mutate = (fn) => S().mutate(fn);
const clone = (v) => (v === undefined ? v : structuredClone(v));

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function call(method, path, fn, { min = 180, max = 650, poll = false } = {}) {
  const ms = Math.round(min + Math.random() * (max - min));
  await sleep(ms);
  const entry = { id: `${Date.now()}-${Math.random()}`, at: new Date().toISOString(), method, path, ms, poll };
  try {
    const result = fn();
    S().logCall({ ...entry, status: method === 'POST' ? 201 : 200 });
    return clone(result);
  } catch (e) {
    S().logCall({ ...entry, status: e.status || 500, error: e.code || e.message });
    throw e;
  }
}

const nextId = (prefix) => {
  let id;
  mutate((s) => {
    id = `${prefix}-${String(s.db.nextId).padStart(4, '0')}`;
    s.db.nextId += 1;
  });
  return id;
};

const phaseRank = () => ({ p1: 1, golive: 2, all: 3 })[S().demo.phase];

// ------------------------------------------------------------------ lookups and derived data

export const customer = (id) => CUSTOMERS.find((c) => c.id === id);
export const driver = (id) => DRIVERS.find((d) => d.id === id);
export const truck = (id) => TRUCKS.find((t) => t.id === id);
export const shipper = (id) => SHIPPERS.find((s) => s.id === id);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const stopPoint = (stop) => (stop.lat != null ? { lat: stop.lat, lng: stop.lng } : customer(stop.customerId));
const tripPoints = (trip) => [DEPOT, ...trip.stops.map(stopPoint)];
const tripPath = (trip) => routePath(tripPoints(trip));

function livePosition(trip) {
  if (trip.driverId === DEMO_DRIVER_ID && trip.status === 'active') {
    return S().db.livePositions?.[trip.truckId] || { lat: DEPOT.lat, lng: DEPOT.lng };
  }
  if (trip.status !== 'active') return null;
  return pointAlong(tripPath(trip), trip.progress);
}

const parkedPosition = (truckId) => {
  const i = TRUCKS.findIndex((t) => t.id === truckId);
  return { lat: DEPOT.lat + 0.0012 * (i - 2), lng: DEPOT.lng + 0.0016 * ((i % 3) - 1) };
};

function confidence(docNo, key, lowField) {
  if (key === lowField) return +(0.55 + hash(docNo + key) * 0.13).toFixed(2);
  return +(0.86 + hash(docNo + key) * 0.13).toFixed(2);
}

function bolFields(trip) {
  const doc = Object.values(S().db.documents).find((d) => d.kind === 'bol' && d.docNo === trip.bol.docNo);
  if (doc?.fields) return doc.fields;
  const review = S().db.reviews[trip.bol.docNo];
  const low = review?.lowField;
  const f = (key, value) => ({ key, value, confidence: confidence(trip.bol.docNo, key, low) });
  const fields = [
    f('docNo', trip.bol.docNo),
    f('date', dayjs(trip.date).format('DD/MM/YYYY')),
    f('shipper', shipper(trip.bol.shipperId).name),
    f('vehicle', truck(trip.truckId).plate),
  ];
  trip.stops.forEach((s, i) => {
    const c = customer(s.customerId);
    fields.push(f(`consignee_${i + 1}`, c.name), f(`address_${i + 1}`, c.address), f(`pallets_${i + 1}`, s.pallets));
  });
  fields.push(f('weight_total', trip.stops.reduce((n, s) => n + s.weightKg, 0)));
  return applyCorrections(trip.bol.docNo, fields);
}

function noteFields(trip, stop) {
  const dn = stop.deliveryNote;
  const doc = Object.values(S().db.documents).find((d) => d.kind === 'delivery_note' && d.docNo === dn.docNo);
  if (doc?.fields) return doc.fields;
  const c = customer(stop.customerId);
  const mm = dn.match === 'mismatch' ? dn.mismatchField : null;
  const f = (key, value) => ({ key, value, confidence: confidence(dn.docNo, key, mm) });
  const fields = [
    f('docNo', dn.docNo),
    f('bolRef', mm === 'docNo' ? trip.bol.docNo.replace(/\d$/, (d) => String((+d + 3) % 10)) : trip.bol.docNo),
    f('consignee', mm === 'consignee' ? { en: `${c.name.en} Ltd`, he: `${c.name.he} בע"מ` } : c.name),
    f('quantity', mm === 'quantity' ? stop.pallets + 1 : stop.pallets),
  ];
  return applyCorrections(dn.docNo, fields);
}

function applyCorrections(docNo, fields) {
  const corr = S().db.reviews[docNo]?.corrections;
  if (!corr) return fields;
  return fields.map((f) => (corr[f.key] != null ? { ...f, value: corr[f.key], confidence: 1, corrected: true } : f));
}

const BEHAVIOUR_WEIGHTS = { harsh_braking: 1, harsh_acceleration: 0.7, speeding: 1.2 };
function behaviourScore(events, km) {
  const weighted = events.reduce((n, e) => n + (BEHAVIOUR_WEIGHTS[e.type] || 0), 0);
  const per100 = (weighted / Math.max(km, 40)) * 100;
  return Math.max(40, Math.min(100, Math.round(100 - per100 * 12)));
}

function tripSummary(trip) {
  const d = driver(trip.driverId);
  const t = truck(trip.truckId);
  const alerts = (S().db.alerts || []).filter((a) => a.tripId === trip.id);
  return {
    ...trip,
    driverName: d.name,
    truckPlate: t.plate,
    stopsDone: trip.stops.filter((s) => s.status === 'done').length,
    customers: trip.stops.map((s) => customer(s.customerId).name),
    alerts,
  };
}

function recomputeEtas(trip, from, extraMin = 0) {
  let t = dayjs().add(extraMin, 'minute');
  let prev = from;
  trip.stops.forEach((s) => {
    if (s.status === 'done') return;
    const p = stopPoint(s);
    t = t.add(Math.round(driveMin(roadKm(prev, p), 1.1)), 'minute');
    s.etaAt = t.toISOString();
    t = t.add(SERVICE_MIN_PER_STOP, 'minute');
    prev = p;
  });
}

function addNotification(s, n) {
  s.db.notifications.unshift({ id: `N-${s.db.nextId++}`, at: new Date().toISOString(), read: false, ...n });
}

// ------------------------------------------------------------------ driver app (phone)

export const loginDriver = (driverId, pin) =>
  call('POST', '/auth/driver', () => {
    const d = DRIVERS.find((x) => x.id === String(driverId).trim());
    if (!d || d.pin !== String(pin)) throw new ApiError(401, 'invalid_credentials');
    mutate((s) => {
      s.phone.session = { driverId: d.id, token: `tok_${d.id}_${Date.now()}` };
    });
    return { driver: d, truck: truck(d.truckId) };
  });

export const logoutDriver = () =>
  call('POST', '/auth/driver/logout', () => mutate((s) => void (s.phone.session = null)), { max: 250 });

export const getHome = () =>
  call('GET', '/driver/home', () => {
    const { phone, db } = S();
    const d = driver(phone.session?.driverId || DEMO_DRIVER_ID);
    const today = dayjs().format('YYYY-MM-DD');
    const active = db.trips.find((t) => t.id === phone.activeTripId);
    return {
      driver: d,
      truck: truck(d.truckId),
      shift: db.shifts?.[d.id] || null,
      activeTrip: active ? tripSummary(active) : null,
      inspectionToday: db.inspections.find((i) => i.truckId === d.truckId && i.date === today) || null,
    };
  }, { min: 120, max: 300, poll: true });

export const startShift = () =>
  call('POST', '/driver/shift/start', () => {
    mutate((s) => {
      s.db.shifts = s.db.shifts || {};
      s.db.shifts[DEMO_DRIVER_ID] = { startedAt: new Date().toISOString(), endedAt: null };
      s.db.livePositions = s.db.livePositions || {};
      s.db.livePositions.t1 = { lat: DEPOT.lat, lng: DEPOT.lng, at: new Date().toISOString() };
    });
    return S().db.shifts[DEMO_DRIVER_ID];
  });

export const endShift = () =>
  call('POST', '/driver/shift/end', () => {
    mutate((s) => {
      if (s.db.shifts?.[DEMO_DRIVER_ID]) s.db.shifts[DEMO_DRIVER_ID].endedAt = new Date().toISOString();
    });
    return S().db.shifts[DEMO_DRIVER_ID];
  });

// Photo upload to Cloud Storage. Returns the document id.
// `paperDocNo` is the number printed on the paper in the demo; the real backend reads it from the photo.
export const uploadPhoto = ({ kind, tripId = null, stopId = null, paperDocNo = null }) =>
  call(
    'POST',
    '/documents/upload',
    () => {
      const id = nextId('DOC');
      mutate((s) => {
        const n = s.db.nextId;
        s.db.documents[id] = {
          id,
          kind,
          tripId,
          stopId,
          docNo: paperDocNo || (kind === 'bol' ? `BL-${48210 + n}` : `DN-${75300 + n}`),
          uploadedAt: new Date().toISOString(),
          status: 'uploaded',
        };
        if (kind === 'bol') s.phone.lastScannedDocId = id;
      });
      return { documentId: id };
    },
    { min: 700, max: 1200 },
  );

function candidatesFor(drop) {
  const c = customer(drop.customerId);
  const exact = { id: `${c.id}-a`, label: c.address, lat: c.lat, lng: c.lng, customerId: c.id, score: 0.97 };
  if (drop.ambiguous) {
    return [
      { ...exact, score: 0.71 },
      { id: `${c.id}-b`, label: { en: 'Herzl St 120, Rishon LeZion', he: 'הרצל 120, ראשון לציון' }, lat: 31.9652, lng: 34.8041, customerId: null, score: 0.68 },
      { id: `${c.id}-c`, label: { en: 'Herzl St 12, Rehovot', he: 'הרצל 12, רחובות' }, lat: 31.8985, lng: 34.8075, customerId: null, score: 0.52 },
    ];
  }
  const city = c.address.en.split(', ')[1];
  return [exact, { id: `${c.id}-b`, label: { en: `${c.address.en.split(',')[0]}, ${city} (north)`, he: `${c.address.he.split(',')[0]}, ${c.address.he.split(', ')[1]} (צפון)` }, lat: c.lat + 0.018, lng: c.lng + 0.006, customerId: null, score: 0.44 }];
}

// Vertex AI field extraction on the fixed field schema, with per-field confidence.
export const extractBol = (documentId) =>
  call(
    'POST',
    `/documents/${documentId}/extract`,
    () => {
      const doc = S().db.documents[documentId];
      if (!doc) throw new ApiError(404, 'not_found');
      const sh = shipper(DEMO_BOL.shipperId);
      const fields = [
        { key: 'docNo', value: doc.docNo, confidence: 0.98 },
        { key: 'date', value: dayjs().format('DD/MM/YYYY'), confidence: 0.97 },
        { key: 'shipper', value: sh.name, confidence: 0.95 },
        { key: 'vehicle', value: truck('t1').plate, confidence: 0.91 },
      ];
      DEMO_BOL.drops.forEach((d, i) => {
        const c = customer(d.customerId);
        fields.push(
          { key: `consignee_${i + 1}`, value: c.name, confidence: 0.93 - i * 0.02 },
          { key: `address_${i + 1}`, value: { en: d.rawAddress, he: d.rawAddress }, confidence: d.ambiguous ? 0.66 : 0.9 },
          { key: `pallets_${i + 1}`, value: d.pallets, confidence: d.handwritten ? 0.58 : 0.94 },
        );
      });
      fields.push({ key: 'weight_total', value: DEMO_BOL.drops.reduce((n, d) => n + d.weightKg, 0), confidence: 0.88 });
      const drops = DEMO_BOL.drops.map((d, i) => ({
        index: i + 1,
        customerId: d.customerId,
        rawAddress: d.rawAddress,
        pallets: d.pallets,
        weightKg: d.weightKg,
        candidates: candidatesFor(d),
      }));
      mutate((s) => {
        s.db.documents[documentId].fields = fields;
        s.db.documents[documentId].status = 'extracted';
      });
      return { documentId, docNo: doc.docNo, fields, drops };
    },
    { min: 1400, max: 2200 },
  );

// Address search for the destination field (address autocomplete, Phase 2 during the pilot).
export const geocode = (query) =>
  call(
    'GET',
    `/geocode?q=${encodeURIComponent(query)}`,
    () => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) return [];
      return CUSTOMERS.filter(
        (c) => c.address.en.toLowerCase().includes(q) || c.address.he.includes(query.trim()) || c.name.en.toLowerCase().includes(q) || c.name.he.includes(query.trim()),
      )
        .slice(0, 5)
        .map((c) => ({ id: `${c.id}-a`, label: c.address, name: c.name, lat: c.lat, lng: c.lng, customerId: c.id, score: 0.95 }));
    },
    { min: 120, max: 260, poll: true },
  );

// Confirm step: stores the driver's corrections, orders the stops (Routes API waypoint
// optimisation, traffic-aware) and creates the trip with route version 1.
export const createTrip = ({ documentId, fields, drops }) =>
  call(
    'POST',
    '/trips',
    () => {
      const doc = S().db.documents[documentId];
      const id = `TR-${dayjs().format('YYMMDD')}-${DEMO_DRIVER_ID}-${S().db.nextId}`;
      const start = S().db.livePositions?.t1 || DEPOT;
      const pts = drops.map((d) => ({ ...d, lat: d.candidate.lat, lng: d.candidate.lng }));
      const ordered = nearestNeighbourOrder(start, pts);
      mutate((s) => {
        s.db.nextId += 1;
        const extracted = s.db.documents[documentId].fields || [];
        const finalFields = fields.map((f) => {
          const orig = extracted.find((x) => x.key === f.key);
          const changed = orig && JSON.stringify(orig.value) !== JSON.stringify(f.value);
          return changed ? { ...f, confidence: 1, corrected: true } : f;
        });
        s.db.documents[documentId].fields = finalFields;
        s.db.documents[documentId].status = 'confirmed';
        s.db.documents[documentId].tripId = id;
        const trip = {
          id,
          driverId: DEMO_DRIVER_ID,
          truckId: 't1',
          date: dayjs().format('YYYY-MM-DD'),
          status: 'active',
          startedAt: new Date().toISOString(),
          completedAt: null,
          bol: { docNo: doc.docNo, shipperId: DEMO_BOL.shipperId, documentId },
          stops: ordered.map((d, i) => ({
            id: `${id}-S${i + 1}`,
            customerId: d.candidate.customerId || d.customerId,
            lat: d.lat,
            lng: d.lng,
            addressLabel: d.candidate.label,
            dropIndex: d.index,
            order: i + 1,
            etaAt: null,
            arrivedAt: null,
            completedAt: null,
            status: 'pending',
            pallets: Number(finalFields.find((f) => f.key === `pallets_${d.index}`)?.value ?? d.pallets),
            weightKg: d.weightKg,
            deliveryNote: null,
          })),
          routeVersions: [],
          km: 0,
          durationMin: 0,
          progress: 0,
        };
        recomputeEtas(trip, start);
        const km = Math.round(trip.stops.reduce((acc, st, i) => acc + roadKm(i === 0 ? start : stopPoint(trip.stops[i - 1]), stopPoint(st)), 0));
        trip.routeVersions.push({ v: 1, at: trip.startedAt, reason: 'initial', km });
        trip.km = km;
        s.db.trips.push(trip);
        s.phone.activeTripId = id;
        s.db.livePositions = s.db.livePositions || {};
        s.db.livePositions.t1 = { lat: start.lat, lng: start.lng, at: new Date().toISOString() };
        // Low-confidence fields the driver did not correct go to the dispatcher review step.
        const low = finalFields.find((f) => !f.corrected && f.confidence < 0.7);
        if (low) {
          s.db.reviews[doc.docNo] = { status: 'needs_review', kind: 'bol', tripId: id, lowField: low.key, at: new Date().toISOString() };
          addNotification(s, { type: 'review', docNo: doc.docNo });
        }
      });
      return tripSummary(S().db.trips.find((t) => t.id === id));
    },
    { min: 900, max: 1400 },
  );

export const getTrip = (tripId) =>
  call(
    'GET',
    `/trips/${tripId}`,
    () => {
      const trip = S().db.trips.find((t) => t.id === tripId);
      if (!trip) throw new ApiError(404, 'not_found');
      return { ...tripSummary(trip), path: tripPath(trip), position: livePosition(trip) };
    },
    { min: 150, max: 350, poll: true },
  );

export const reportPosition = (tripId, pos) =>
  call(
    'POST',
    `/trips/${tripId}/positions`,
    () => {
      mutate((s) => {
        s.db.livePositions = s.db.livePositions || {};
        s.db.livePositions.t1 = { ...pos, at: new Date().toISOString() };
        s.phone.position = pos;
      });
      return { ok: true };
    },
    { min: 60, max: 140, poll: true },
  );

// Delay alerts waiting for the driver: the app polls this while the trip screen is open.
export const getAlerts = (tripId) =>
  call('GET', `/trips/${tripId}/alerts`, () => (S().db.alerts || []).filter((a) => a.tripId === tripId && a.status === 'pending'), {
    min: 120,
    max: 260,
    poll: true,
  });

export const respondAlert = (alertId, choice) =>
  call('POST', `/alerts/${alertId}/${choice}`, () => {
    mutate((s) => {
      const alert = s.db.alerts.find((a) => a.id === alertId);
      if (!alert || alert.status !== 'pending') return;
      alert.status = choice === 'reroute' ? 'rerouted' : 'kept';
      alert.respondedAt = new Date().toISOString();
      const trip = s.db.trips.find((t) => t.id === alert.tripId);
      const from = s.db.livePositions?.[trip.truckId] || DEPOT;
      if (choice === 'reroute') {
        // The next stop stays; the new route changes the order of the drops after it.
        const pending = trip.stops.filter((st) => st.status !== 'done');
        if (pending.length > 2) {
          const reordered = [pending[0], ...pending.slice(1).reverse()];
          const done = trip.stops.filter((st) => st.status === 'done');
          trip.stops = [...done, ...reordered].map((st, i) => ({ ...st, order: i + 1 }));
        }
        recomputeEtas(trip, from, alert.delayMin - alert.savesMin);
        trip.routeVersions.push({ v: trip.routeVersions.length + 1, at: new Date().toISOString(), reason: 'delay_reroute', km: Math.round(trip.km * 1.03) });
      } else {
        recomputeEtas(trip, from, alert.delayMin);
      }
      s.phone.pushes = s.phone.pushes.filter((p) => p.alertId !== alertId);
    });
    return { ok: true };
  });

export const arriveStop = (tripId, stopId) =>
  call('POST', `/trips/${tripId}/stops/${stopId}/arrived`, () => {
    mutate((s) => {
      const st = s.db.trips.find((t) => t.id === tripId).stops.find((x) => x.id === stopId);
      if (st.status === 'pending') {
        st.status = 'arrived';
        st.arrivedAt = new Date().toISOString();
      }
    });
    return { ok: true };
  });

// Delivery-note extraction and automatic matching with the bill of lading on document number,
// consignee and quantity. A mismatch is flagged for the dispatcher.
export const submitDeliveryNote = (tripId, stopId, documentId) =>
  call(
    'POST',
    `/trips/${tripId}/stops/${stopId}/delivery-note`,
    () => {
      let result;
      mutate((s) => {
        const trip = s.db.trips.find((t) => t.id === tripId);
        const st = trip.stops.find((x) => x.id === stopId);
        const doc = s.db.documents[documentId];
        const c = customer(st.customerId);
        // The demo's second drop has a handwritten "5" on the note against 4 pallets on the bill of lading.
        const noteQty = st.dropIndex === 2 ? 5 : st.pallets;
        const fields = [
          { key: 'docNo', value: doc.docNo, confidence: 0.96 },
          { key: 'bolRef', value: trip.bol.docNo, confidence: 0.93 },
          { key: 'consignee', value: c.name, confidence: 0.92 },
          { key: 'quantity', value: noteQty, confidence: st.dropIndex === 2 ? 0.81 : 0.95 },
        ];
        doc.fields = fields;
        doc.status = 'extracted';
        const mismatchField = noteQty !== st.pallets ? 'quantity' : null;
        st.deliveryNote = { docNo: doc.docNo, documentId, match: mismatchField ? 'mismatch' : 'matched', mismatchField };
        if (mismatchField) {
          s.db.reviews[doc.docNo] = { status: 'needs_review', kind: 'delivery_note', tripId, stopId, lowField: mismatchField, at: new Date().toISOString() };
          addNotification(s, { type: 'mismatch', docNo: doc.docNo, driverId: trip.driverId, tripId });
        }
        result = { match: st.deliveryNote.match, mismatchField, fields, bolPallets: st.pallets };
      });
      return result;
    },
    { min: 1200, max: 1800 },
  );

export const completeStop = (tripId, stopId) =>
  call('POST', `/trips/${tripId}/stops/${stopId}/complete`, () => {
    mutate((s) => {
      const st = s.db.trips.find((t) => t.id === tripId).stops.find((x) => x.id === stopId);
      st.status = 'done';
      st.arrivedAt = st.arrivedAt || new Date().toISOString();
      st.completedAt = new Date().toISOString();
    });
    return { ok: true };
  });

export const completeTrip = (tripId) =>
  call('POST', `/trips/${tripId}/complete`, () => {
    mutate((s) => {
      const trip = s.db.trips.find((t) => t.id === tripId);
      trip.status = 'completed';
      trip.completedAt = new Date().toISOString();
      trip.durationMin = Math.max(1, dayjs(trip.completedAt).diff(trip.startedAt, 'minute'));
      trip.progress = 1;
      s.phone.activeTripId = null;
    });
    const trip = S().db.trips.find((t) => t.id === tripId);
    const events = S().db.events.filter((e) => e.tripId === tripId);
    return { ...tripSummary(trip), events, score: behaviourScore(events, trip.km) };
  });

// Harsh events are computed on the phone from the accelerometer and sent immediately;
// speeding is checked against the configured truck speed threshold.
export const postDrivingEvent = (type, value) =>
  call('POST', '/telemetry/events', () => {
    const st = S();
    const tripId = st.phone.activeTripId;
    const pos = st.db.livePositions?.t1 || DEPOT;
    const threshold = st.db.settings.speedThresholdKmh;
    if (type === 'speeding' && value <= threshold) return { recorded: false };
    mutate((s) => {
      const id = `E-${s.db.nextId++}`;
      s.db.events.push({ id, tripId, driverId: DEMO_DRIVER_ID, truckId: 't1', at: new Date().toISOString(), type, value, lat: pos.lat, lng: pos.lng });
      addNotification(s, { type, driverId: DEMO_DRIVER_ID, tripId, value });
    });
    return { recorded: true };
  });

export const submitInspection = ({ answers, photo }) =>
  call('POST', '/inspections', () => {
    const date = dayjs().format('YYYY-MM-DD');
    mutate((s) => {
      s.db.inspections = s.db.inspections.filter((i) => !(i.truckId === 't1' && i.date === date));
      s.db.inspections.push({ id: `I-${dayjs().format('YYMMDD')}-t1`, truckId: 't1', driverId: DEMO_DRIVER_ID, date, at: new Date().toISOString(), answers, photo });
    });
    return { ok: true };
  });

export const getTripHistory = () =>
  call('GET', '/driver/trips', () =>
    S()
      .db.trips.filter((t) => t.driverId === DEMO_DRIVER_ID && t.status === 'completed')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 20)
      .map(tripSummary),
  );

// ------------------------------------------------------------------ traffic monitor (backend job)

// The monitor re-checks ETAs on every position report and every 15 minutes. In the demo the
// delay is injected by a button; it is raised only above the delay threshold and never twice.
export const simulateDelay = (tripId) =>
  call('POST', '/monitor/simulate-delay', () => {
    const st = S();
    const trip = tripId ? st.db.trips.find((t) => t.id === tripId) : st.db.trips.find((t) => t.id === st.phone.activeTripId);
    if (!trip || trip.status !== 'active') throw new ApiError(409, 'no_active_trip');
    const existing = (st.db.alerts || []).find((a) => a.tripId === trip.id && a.status === 'pending');
    if (existing) return existing;
    const delayMin = 14;
    if (delayMin < st.db.settings.delayThresholdMin) return null;
    let alert;
    mutate((s) => {
      s.db.alerts = s.db.alerts || [];
      alert = { id: `A-${s.db.nextId++}`, tripId: trip.id, type: 'delay', delayMin, savesMin: 9, createdAt: new Date().toISOString(), status: 'pending' };
      s.db.alerts.push(alert);
      addNotification(s, { type: 'delay', driverId: trip.driverId, tripId: trip.id, delayMin });
      // Phase 2 adds push through Firebase Cloud Messaging, so the alert reaches a locked phone.
      if (trip.driverId === DEMO_DRIVER_ID && phaseRank() >= 2) {
        s.phone.pushes.push({ id: `P-${s.db.nextId++}`, alertId: alert.id, type: 'delay', delayMin, at: alert.createdAt });
      }
    });
    return alert;
  });

// Moves the other trucks along their routes, so the live map is alive.
export function fleetTick() {
  mutate((s) => {
    s.db.trips.forEach((t) => {
      if (t.status !== 'active' || t.driverId === DEMO_DRIVER_ID) return;
      t.progress = Math.min(0.97, t.progress + 0.003);
      const doneCount = Math.floor(t.progress * t.stops.length);
      t.stops.forEach((st, i) => {
        if (i < doneCount && st.status !== 'done') {
          st.status = 'done';
          st.arrivedAt = new Date().toISOString();
          st.completedAt = new Date().toISOString();
          st.deliveryNote = { docNo: `DN-${76000 + s.db.nextId++}`, match: 'matched', mismatchField: null };
        }
      });
    });
  });
}

// ------------------------------------------------------------------ dispatcher console

export const loginDispatcher = (email, password) =>
  call('POST', '/auth/dispatcher', () => {
    const d = DISPATCHERS.find((x) => x.email === email.trim().toLowerCase());
    if (!d || d.password !== password) throw new ApiError(401, 'invalid_credentials');
    mutate((s) => void (s.demo.consoleSignedIn = d.email));
    return d;
  });

export const logoutDispatcher = () => call('POST', '/auth/dispatcher/logout', () => mutate((s) => void (s.demo.consoleSignedIn = false)));

export const listTrips = ({ date } = {}) =>
  call(
    'GET',
    `/trips?date=${date || 'today'}`,
    () => {
      const d = date || dayjs().format('YYYY-MM-DD');
      return S()
        .db.trips.filter((t) => t.date === d)
        .sort((a, b) => (a.status === b.status ? b.startedAt.localeCompare(a.startedAt) : a.status === 'active' ? -1 : 1))
        .map(tripSummary);
    },
    { poll: true },
  );

export const getTripDetail = (tripId) =>
  call(
    'GET',
    `/trips/${tripId}/detail`,
    () => {
      const trip = S().db.trips.find((t) => t.id === tripId);
      if (!trip) throw new ApiError(404, 'not_found');
      const events = S().db.events.filter((e) => e.tripId === tripId);
      const notes = trip.stops
        .filter((st) => st.deliveryNote)
        .map((st) => ({ stopId: st.id, customer: customer(st.customerId).name, ...st.deliveryNote, fields: noteFields(trip, st) }));
      return {
        ...tripSummary(trip),
        path: tripPath(trip),
        position: livePosition(trip),
        bolFields: bolFields(trip),
        notes,
        events,
        score: behaviourScore(events, trip.km),
        notifications: S().db.notifications.filter((n) => n.tripId === tripId),
      };
    },
    { poll: true },
  );

export const listLive = () =>
  call(
    'GET',
    '/fleet/live',
    () => {
      const { db } = S();
      return TRUCKS.map((t) => {
        const d = DRIVERS.find((x) => x.truckId === t.id);
        const trip = db.trips.find((x) => x.truckId === t.id && x.status === 'active');
        const shift = db.shifts?.[d.id];
        const onShift = d.id === DEMO_DRIVER_ID ? !!(shift && !shift.endedAt) : !!trip;
        const pos = trip ? livePosition(trip) : d.id === DEMO_DRIVER_ID && onShift ? db.livePositions?.t1 || parkedPosition(t.id) : parkedPosition(t.id);
        return {
          truck: t,
          driver: d,
          status: trip ? 'on_trip' : onShift ? 'on_shift' : 'off',
          position: pos,
          tripId: trip?.id || null,
          nextStop: trip ? customer(trip.stops.find((s) => s.status !== 'done')?.customerId || trip.stops.at(-1).customerId).name : null,
        };
      });
    },
    { poll: true },
  );

export const listDeliveries = ({ from, to, driverId, truckId } = {}) =>
  call('GET', '/deliveries', () => {
    const out = [];
    S().db.trips.forEach((trip) => {
      if (from && trip.date < from) return;
      if (to && trip.date > to) return;
      if (driverId && trip.driverId !== driverId) return;
      if (truckId && trip.truckId !== truckId) return;
      trip.stops.forEach((st) => {
        if (st.status !== 'done') return;
        const review = S().db.reviews[st.deliveryNote?.docNo];
        out.push({
          id: st.id,
          tripId: trip.id,
          date: trip.date,
          completedAt: st.completedAt,
          driverId: trip.driverId,
          driverName: driver(trip.driverId).name,
          truckPlate: truck(trip.truckId).plate,
          customer: customer(st.customerId).name,
          address: st.addressLabel || customer(st.customerId).address,
          pallets: st.pallets,
          weightKg: st.weightKg,
          bolDocNo: trip.bol.docNo,
          noteDocNo: st.deliveryNote?.docNo || null,
          match: st.deliveryNote?.match || 'pending',
          reviewStatus: review?.status || null,
        });
      });
    });
    return out.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  });

export const getDeliveryDocuments = (tripId, stopId) =>
  call('GET', `/trips/${tripId}/stops/${stopId}/documents`, () => {
    const trip = S().db.trips.find((t) => t.id === tripId);
    const st = trip.stops.find((x) => x.id === stopId);
    return {
      bol: { docNo: trip.bol.docNo, fields: bolFields(trip) },
      note: st.deliveryNote ? { docNo: st.deliveryNote.docNo, match: st.deliveryNote.match, mismatchField: st.deliveryNote.mismatchField, fields: noteFields(trip, st) } : null,
    };
  });

export const listReview = () =>
  call(
    'GET',
    '/review',
    () =>
      Object.entries(S().db.reviews)
        .filter(([, r]) => r.status === 'needs_review')
        .map(([docNo, r]) => {
          const trip = S().db.trips.find((t) => t.id === r.tripId);
          const st = r.stopId ? trip.stops.find((x) => x.id === r.stopId) : null;
          return {
            docNo,
            ...r,
            driverName: driver(trip.driverId).name,
            truckPlate: truck(trip.truckId).plate,
            customer: st ? customer(st.customerId).name : null,
            fields: r.kind === 'bol' ? bolFields(trip) : noteFields(trip, st),
            bolFields: r.kind === 'delivery_note' ? bolFields(trip) : null,
            bolPallets: st?.pallets ?? null,
            bolDocNo: trip.bol.docNo,
          };
        })
        .sort((a, b) => b.at.localeCompare(a.at)),
    { poll: true },
  );

export const resolveReview = (docNo, { action, corrections = null }) =>
  call('POST', `/review/${docNo}/${action}`, () => {
    mutate((s) => {
      const r = s.db.reviews[docNo];
      r.status = action === 'approve' ? 'approved' : 'corrected';
      r.resolvedAt = new Date().toISOString();
      r.resolvedBy = s.demo.consoleSignedIn || 'noa@trafixct.co.il';
      if (corrections) r.corrections = corrections;
      const doc = Object.values(s.db.documents).find((d) => d.docNo === docNo);
      if (doc?.fields && corrections) {
        doc.fields = doc.fields.map((f) => (corrections[f.key] != null ? { ...f, value: corrections[f.key], confidence: 1, corrected: true } : f));
      }
    });
    return { ok: true };
  });

export const listEvents = ({ from, to, driverId, type } = {}) =>
  call('GET', '/telemetry/events', () =>
    S()
      .db.events.filter((e) => (!from || e.at.slice(0, 10) >= from) && (!to || e.at.slice(0, 10) <= to))
      .filter((e) => (!driverId || e.driverId === driverId) && (!type || e.type === type))
      .map((e) => ({ ...e, driverName: driver(e.driverId).name, truckPlate: truck(e.truckId).plate }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );

export const listNotifications = () =>
  call(
    'GET',
    '/notifications',
    () =>
      S().db.notifications.map((n) => ({ ...n, driverName: n.driverId ? driver(n.driverId).name : null })),
    { min: 120, max: 300, poll: true },
  );

export const markNotificationsRead = () =>
  call('POST', '/notifications/read-all', () => mutate((s) => s.db.notifications.forEach((n) => void (n.read = true))));

export const getSettings = () => call('GET', '/settings', () => S().db.settings);
export const saveSettings = (patch) =>
  call('PUT', '/settings', () => {
    mutate((s) => Object.assign(s.db.settings, patch));
    return S().db.settings;
  });

export const getMasterData = () =>
  call('GET', '/master-data', () => ({ drivers: DRIVERS.map(({ pin, ...d }) => d), trucks: TRUCKS, customers: CUSTOMERS }));

const TEMPLATE_HEADERS = {
  drivers: ['driver_id', 'full_name', 'phone_model', 'truck_plate'],
  trucks: ['plate', 'model', 'tracker'],
  customers: ['customer_name', 'address', 'city', 'eytam_code'],
};

export const getImportTemplate = (entity) =>
  call('GET', `/master-data/${entity}/template`, () => ({
    filename: `trafixct_${entity}_template.csv`,
    content: toCsv(TEMPLATE_HEADERS[entity], [
      entity === 'drivers' ? ['1007', 'Example Driver', 'Samsung Galaxy A54', '214-55-301'] : entity === 'trucks' ? ['555-12-345', 'Volvo FH 460', 'Ituran'] : ['Example Ltd', 'HaMelacha St 1', 'Holon', 'EY-2001'],
    ]),
  }));

export const validateImport = (entity, fileName) =>
  call(
    'POST',
    `/master-data/${entity}/import`,
    () => {
      const reasons = {
        drivers: [{ row: 7, reason: 'missing_truck_plate' }, { row: 15, reason: 'duplicate_driver_id' }],
        trucks: [{ row: 4, reason: 'invalid_plate' }],
        customers: [{ row: 12, reason: 'missing_address' }, { row: 19, reason: 'unknown_city' }, { row: 23, reason: 'duplicate_customer' }],
      }[entity];
      const total = { drivers: 24, trucks: 9, customers: 41 }[entity];
      return { fileName, total, imported: total - reasons.length, invalid: reasons };
    },
    { min: 900, max: 1500 },
  );

// CSV exports: deliveries, driving events and trip performance per period.
export const exportCsv = (kind, { from, to }) =>
  call('GET', `/exports/${kind}.csv?from=${from}&to=${to}`, () => {
    const lang = S().demo.lang;
    const L = (v) => (v && typeof v === 'object' ? v[lang] : v);
    const inRange = (d) => d >= from && d <= to;
    let headers;
    let rows;
    if (kind === 'deliveries') {
      headers = ['date', 'trip', 'driver', 'truck', 'customer', 'address', 'pallets', 'weight_kg', 'bill_of_lading', 'delivery_note', 'match'];
      rows = [];
      S().db.trips.filter((t) => inRange(t.date)).forEach((t) =>
        t.stops.filter((s) => s.status === 'done').forEach((s) =>
          rows.push([t.date, t.id, L(driver(t.driverId).name), truck(t.truckId).plate, L(customer(s.customerId).name), L(s.addressLabel || customer(s.customerId).address), s.pallets, s.weightKg, t.bol.docNo, s.deliveryNote?.docNo || '', s.deliveryNote?.match || '']),
        ),
      );
    } else if (kind === 'events') {
      headers = ['time', 'driver', 'truck', 'trip', 'type', 'value'];
      rows = S().db.events.filter((e) => inRange(e.at.slice(0, 10))).map((e) => [dayjs(e.at).format('YYYY-MM-DD HH:mm'), L(driver(e.driverId).name), truck(e.truckId).plate, e.tripId, e.type, e.value]);
    } else {
      headers = ['date', 'trip', 'driver', 'truck', 'stops', 'km', 'duration_min', 'route_versions', 'events', 'score'];
      rows = S().db.trips.filter((t) => inRange(t.date) && t.status === 'completed').map((t) => {
        const ev = S().db.events.filter((e) => e.tripId === t.id);
        return [t.date, t.id, L(driver(t.driverId).name), truck(t.truckId).plate, t.stops.length, t.km, t.durationMin, t.routeVersions.length, ev.length, behaviourScore(ev, t.km)];
      });
    }
    return { filename: `trafixct_${kind}_${from}_${to}.csv`, content: toCsv(headers, rows), count: rows.length };
  });

// ------------------------------------------------------------------ Phase 2 during the pilot

const PILOT_FUEL_FACTOR = (tripId) => 0.33 * (0.86 + hash(tripId) * 0.07); // liters per km in the pilot

export const getReferenceData = () =>
  call('GET', '/savings/reference', () => S().db.reference.map((r) => ({ ...r, plate: truck(r.truckId).plate })));

export const getSavings = (granularity = 'day') =>
  call('GET', `/savings?granularity=${granularity}`, () => {
    const { db } = S();
    const price = db.settings.dieselPricePerLiter;
    const ref = db.reference.reduce((a, r) => ({ km: a.km + r.km, liters: a.liters + r.liters, deliveries: a.deliveries + r.deliveries }), { km: 0, liters: 0, deliveries: 0 });
    const reference = { kmPerDelivery: ref.km / ref.deliveries, fuelCostPerDelivery: (ref.liters * price) / ref.deliveries };
    const groups = {};
    db.trips.filter((t) => t.status === 'completed').forEach((t) => {
      const key = granularity === 'month' ? t.date.slice(0, 7) : t.date;
      const g = (groups[key] = groups[key] || { period: key, km: 0, liters: 0, deliveries: 0 });
      g.km += t.km;
      g.liters += t.km * PILOT_FUEL_FACTOR(t.id);
      g.deliveries += t.stops.length;
    });
    const rows = Object.values(groups)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((g) => {
        const kmPerDelivery = g.km / g.deliveries;
        const fuelCostPerDelivery = (g.liters * price) / g.deliveries;
        return {
          ...g,
          fuelCost: g.liters * price,
          kmPerDelivery,
          fuelCostPerDelivery,
          savingKmPct: (1 - kmPerDelivery / reference.kmPerDelivery) * 100,
          savingFuelPct: (1 - fuelCostPerDelivery / reference.fuelCostPerDelivery) * 100,
        };
      });
    const tot = rows.reduce((a, r) => ({ km: a.km + r.km, fuelCost: a.fuelCost + r.fuelCost, deliveries: a.deliveries + r.deliveries }), { km: 0, fuelCost: 0, deliveries: 0 });
    const total = {
      kmPerDelivery: tot.km / tot.deliveries,
      fuelCostPerDelivery: tot.fuelCost / tot.deliveries,
      savingKmPct: (1 - tot.km / tot.deliveries / reference.kmPerDelivery) * 100,
      savingFuelPct: (1 - tot.fuelCost / tot.deliveries / reference.fuelCostPerDelivery) * 100,
      target: db.settings.savingsTargetPct,
    };
    return { reference, rows, total };
  });

// Route optimisation engine: the dispatcher picks drops; the stop order comes from the same
// Routes API waypoint optimisation that Phase 1 uses.
export const optimizePlan = (customerIds) =>
  call(
    'POST',
    '/planner/optimize',
    () => {
      const drops = customerIds.map(customer);
      const ordered = nearestNeighbourOrder(DEPOT, drops);
      let prev = DEPOT;
      let t = dayjs().hour(7).minute(0);
      let km = 0;
      const stops = ordered.map((c, i) => {
        const leg = roadKm(prev, c);
        km += leg;
        t = t.add(Math.round(driveMin(leg, 1.1)), 'minute');
        const stop = { order: i + 1, customerId: c.id, name: c.name, address: c.address, lat: c.lat, lng: c.lng, eta: t.format('HH:mm'), legKm: Math.round(leg) };
        t = t.add(SERVICE_MIN_PER_STOP, 'minute');
        prev = c;
        return stop;
      });
      const naiveKm = drops.reduce((acc, c, i) => acc + roadKm(i === 0 ? DEPOT : drops[i - 1], c), 0);
      return { stops, km: Math.round(km), naiveKm: Math.round(naiveKm), durationMin: t.diff(dayjs().hour(7).minute(0), 'minute'), path: routePath([DEPOT, ...ordered]) };
    },
    { min: 700, max: 1100 },
  );

export const savePlan = (plan) =>
  call('POST', '/planner/plans', () => {
    mutate((s) => s.db.plans.unshift({ id: `PL-${s.db.nextId++}`, at: new Date().toISOString(), ...plan }));
    return S().db.plans[0];
  });

export const listPlans = () => call('GET', '/planner/plans', () => S().db.plans);

export const listOrders = (date) =>
  call('GET', `/schedule?date=${date}`, () => S().db.orders.filter((o) => o.date === date).map((o) => ({ ...o, customer: customer(o.customerId) })));

export const assignOrder = (orderId, driverId) =>
  call('POST', `/schedule/${orderId}/assign`, () => {
    mutate((s) => {
      const o = s.db.orders.find((x) => x.id === orderId);
      o.assignment = driverId ? { driverId, truckId: driver(driverId).truckId } : null;
    });
    return { ok: true };
  });

export const listInspections = ({ from, to }) =>
  call('GET', `/inspections?from=${from}&to=${to}`, () =>
    S()
      .db.inspections.filter((i) => i.date >= from && i.date <= to)
      .map((i) => ({ ...i, plate: truck(i.truckId).plate, driverName: driver(i.driverId).name, issues: INSPECTION_ITEMS.filter((k) => !i.answers[k]) }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );

// Fuel-efficiency engine and driver behaviour statistics: score per trip and driver from
// harsh events and speeding, per month, with the change against the previous month.
export const getBehaviour = (month) =>
  call('GET', `/behaviour?month=${month}`, () => {
    const { db } = S();
    const prevMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM');
    const calc = (driverId, m) => {
      const trips = db.trips.filter((t) => t.driverId === driverId && t.date.startsWith(m) && t.status === 'completed');
      const ids = new Set(trips.map((t) => t.id));
      const events = db.events.filter((e) => ids.has(e.tripId));
      const km = trips.reduce((n, t) => n + t.km, 0);
      return {
        trips: trips.length,
        km,
        braking: events.filter((e) => e.type === 'harsh_braking').length,
        acceleration: events.filter((e) => e.type === 'harsh_acceleration').length,
        speeding: events.filter((e) => e.type === 'speeding').length,
        score: trips.length ? behaviourScore(events, km) : null,
      };
    };
    return DRIVERS.map((d) => {
      const cur = calc(d.id, month);
      const prev = calc(d.id, prevMonth);
      return { driverId: d.id, driverName: d.name, plate: truck(d.truckId).plate, ...cur, prevScore: prev.score, change: cur.score != null && prev.score != null ? cur.score - prev.score : null };
    });
  });

export const listEytamExports = () => call('GET', '/eytam/exports', () => [...S().db.eytamExports].sort((a, b) => b.date.localeCompare(a.date)));

// Eytam data interface: one-way daily export of completed deliveries as a file.
export const runEytamExport = () =>
  call(
    'POST',
    '/eytam/exports',
    () => {
      const date = dayjs().format('YYYY-MM-DD');
      const rows = [];
      S().db.trips.filter((t) => t.date === date).forEach((t) =>
        t.stops.filter((s) => s.status === 'done').forEach((s) => rows.push([customer(s.customerId).eytam, t.bol.docNo, s.deliveryNote?.docNo || '', s.pallets, s.weightKg, truck(t.truckId).plate, dayjs(s.completedAt).format('YYYY-MM-DD HH:mm')])),
      );
      const file = `eytam_deliveries_${date}.csv`;
      mutate((s) => {
        s.db.eytamExports = s.db.eytamExports.filter((x) => x.date !== date);
        s.db.eytamExports.push({ id: `X-${dayjs().format('YYMMDD')}`, date, at: new Date().toISOString(), deliveries: rows.length, file, status: 'sent' });
      });
      return { filename: file, content: toCsv(['eytam_customer', 'bill_of_lading', 'delivery_note', 'pallets', 'weight_kg', 'truck', 'delivered_at'], rows), count: rows.length };
    },
    { min: 900, max: 1400 },
  );

export const distanceKm = (a, b) => haversineKm(a, b);
export { DEPOT, CUSTOMERS, DRIVERS, TRUCKS, INSPECTION_ITEMS };
