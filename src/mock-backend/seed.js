// Seed data for the mocked backend. Everything is fictional and generated deterministically
// relative to today, so the demo always shows a recent 30-day history.
import dayjs from 'dayjs';
import { nearestNeighbourOrder, roadKm, driveMin, SERVICE_MIN_PER_STOP } from './geo.js';

export const SEED_VERSION = 4;

export const DEPOT = {
  id: 'depot',
  name: { en: 'TrafixCT yard, Ashdod', he: 'חניון TrafixCT, אשדוד' },
  address: { en: 'HaOrgim St 12, Ashdod', he: 'האורגים 12, אשדוד' },
  lat: 31.792,
  lng: 34.6545,
};

export const CUSTOMERS = [
  { id: 'c1', name: { en: 'Shefa Markets', he: 'שפע מרקטים' }, address: { en: 'HaYetsira St 3, Rishon LeZion', he: 'היצירה 3, ראשון לציון' }, lat: 31.9862, lng: 34.7705, eytam: 'EY-1001' },
  { id: 'c2', name: { en: 'Kanaf Electronics', he: 'כנף אלקטרוניקה' }, address: { en: 'HaMelacha St 20, Holon', he: 'המלאכה 20, חולון' }, lat: 32.0095, lng: 34.779, eytam: 'EY-1002' },
  { id: 'c3', name: { en: 'Tamar Home Center', he: 'תמר מרכז הבית' }, address: { en: 'Herzl St 120, Rehovot', he: 'הרצל 120, רחובות' }, lat: 31.897, lng: 34.809, eytam: 'EY-1003' },
  { id: 'c4', name: { en: 'Yam Beverages', he: 'ים משקאות' }, address: { en: 'Yigal Alon St 94, Tel Aviv', he: 'יגאל אלון 94, תל אביב' }, lat: 32.07, lng: 34.794, eytam: 'EY-1004' },
  { id: 'c5', name: { en: 'Ofek Paper', he: 'אופק נייר' }, address: { en: 'HaSivim St 7, Petah Tikva', he: 'הסיבים 7, פתח תקווה' }, lat: 32.102, lng: 34.859, eytam: 'EY-1005' },
  { id: 'c6', name: { en: 'Galil Foods', he: 'מזון הגליל' }, address: { en: 'HaKishon St 10, Haifa', he: 'הקישון 10, חיפה' }, lat: 32.795, lng: 35.035, eytam: 'EY-1006' },
  { id: 'c7', name: { en: 'Or Building Supplies', he: 'אור חומרי בניין' }, address: { en: 'HaKadar St 4, Modiin', he: 'הקדר 4, מודיעין' }, lat: 31.9, lng: 34.99, eytam: 'EY-1007' },
  { id: 'c8', name: { en: 'Negev Pharma Logistics', he: 'נגב פארמה לוגיסטיקה' }, address: { en: 'HaMasger St 15, Beer Sheva', he: 'המסגר 15, באר שבע' }, lat: 31.229, lng: 34.81, eytam: 'EY-1008' },
  { id: 'c9', name: { en: 'Hadar Textiles', he: 'הדר טקסטיל' }, address: { en: 'Sderot Lachish 30, Kiryat Gat', he: 'שדרות לכיש 30, קריית גת' }, lat: 31.609, lng: 34.772, eytam: 'EY-1009' },
  { id: 'c10', name: { en: 'Sela Steel', he: 'סלע פלדה' }, address: { en: 'HaYahalomim St 8, Netanya', he: 'היהלומים 8, נתניה' }, lat: 32.284, lng: 34.862, eytam: 'EY-1010' },
  { id: 'c11', name: { en: 'Talpiot Wholesale', he: 'סיטונאות תלפיות' }, address: { en: 'HaUman St 9, Jerusalem', he: 'האומן 9, ירושלים' }, lat: 31.752, lng: 35.214, eytam: 'EY-1011' },
  { id: 'c12', name: { en: 'Arava Fresh', he: 'ערבה פרש' }, address: { en: 'HaNapah St 5, Ashkelon', he: 'הנפח 5, אשקלון' }, lat: 31.665, lng: 34.595, eytam: 'EY-1012' },
];

export const SHIPPERS = [
  { id: 's1', name: { en: 'Ashdod Port Distribution', he: 'הפצה נמל אשדוד' } },
  { id: 's2', name: { en: 'Delta Logistics', he: 'דלתא לוגיסטיקה' } },
  { id: 's3', name: { en: 'Mivtach Shipping', he: 'מבטח שילוח' } },
];

export const TRUCKS = [
  { id: 't1', plate: '214-55-301', model: 'Volvo FH 460', tracker: 'Ituran' },
  { id: 't2', plate: '318-27-442', model: 'DAF XF 480', tracker: 'Pointer' },
  { id: 't3', plate: '127-90-115', model: 'Mercedes Actros 1845', tracker: 'Ituran' },
  { id: 't4', plate: '561-34-208', model: 'Scania R450', tracker: 'Pointer' },
  { id: 't5', plate: '402-18-773', model: 'MAN TGX 18.470', tracker: 'Ituran' },
  { id: 't6', plate: '289-63-550', model: 'Iveco S-Way 490', tracker: 'Pointer' },
];

export const DRIVERS = [
  { id: '1001', pin: '1234', name: { en: 'Yossi Cohen', he: 'יוסי כהן' }, phone: 'Samsung Galaxy A54', truckId: 't1' },
  { id: '1002', pin: '1234', name: { en: 'Avi Levi', he: 'אבי לוי' }, phone: 'Xiaomi Redmi Note 12', truckId: 't2' },
  { id: '1003', pin: '1234', name: { en: 'Fadi Haddad', he: 'פאדי חדאד' }, phone: 'Samsung Galaxy A34', truckId: 't3' },
  { id: '1004', pin: '1234', name: { en: 'Dani Peretz', he: 'דני פרץ' }, phone: 'Xiaomi 13T', truckId: 't4' },
  { id: '1005', pin: '1234', name: { en: 'Eli Biton', he: 'אלי ביטון' }, phone: 'Redmi 12', truckId: 't5' },
  { id: '1006', pin: '1234', name: { en: 'Rami Azulay', he: 'רמי אזולאי' }, phone: 'Samsung Galaxy A14', truckId: 't6' },
];

export const DISPATCHERS = [
  { email: 'noa@trafixct.co.il', password: 'demo', name: { en: 'Noa Shapiro', he: 'נועה שפירא' } },
  { email: 'omer@trafixct.co.il', password: 'demo', name: { en: 'Omer Katz', he: 'עומר כץ' } },
];

export const INSPECTION_ITEMS = [
  'tires', 'lights', 'brakes', 'mirrors', 'leaks', 'horn', 'wipers', 'load', 'extinguisher', 'papers',
];

// The bill of lading the demo driver "scans" (rendered by phone/DocumentImage.jsx).
export const DEMO_BOL = {
  shipperId: 's1',
  drops: [
    { customerId: 'c1', pallets: 6, weightKg: 3900, rawAddress: 'היצירה 3 ראשון לציון' },
    { customerId: 'c2', pallets: 4, weightKg: 2600, rawAddress: 'המלאכה 20 חולון', handwritten: true },
    { customerId: 'c3', pallets: 8, weightKg: 5200, rawAddress: 'הרצל 120 רחובות', ambiguous: true },
  ],
};

export const DEFAULT_SETTINGS = {
  speedThresholdKmh: 90,
  delayThresholdMin: 10,
  harshBrakingG: 0.45,
  harshAccelG: 0.35,
  dieselPricePerLiter: 7.4,
  savingsTargetPct: 10,
};

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
// Most drops are in the centre; Haifa, Beer Sheva and Jerusalem are occasional long runs.
const FAR = CUSTOMERS.filter((c) => ['c6', 'c8', 'c11'].includes(c.id));
const NEAR = CUSTOMERS.filter((c) => !FAR.includes(c));
const isWorkday = (d) => d.day() !== 5 && d.day() !== 6; // Israel: Sunday-Thursday

export function buildTrip({ id, driver, date, startAt, customerIds, rng, counters, status = 'completed', progress = 1 }) {
  const custs = customerIds.map((cid) => CUSTOMERS.find((c) => c.id === cid));
  const ordered = nearestNeighbourOrder(DEPOT, custs);
  let t = startAt;
  let prev = DEPOT;
  let km = 0;
  const stops = ordered.map((c, i) => {
    const legKm = roadKm(prev, c);
    km += legKm;
    t = t.add(Math.round(driveMin(legKm, 1 + rng() * 0.25)), 'minute');
    const pallets = 2 + Math.floor(rng() * 9);
    const matched = rng() > 0.08;
    const done = status === 'completed' || i < Math.floor(progress * ordered.length);
    const stop = {
      id: `${id}-S${i + 1}`,
      customerId: c.id,
      order: i + 1,
      etaAt: t.toISOString(),
      arrivedAt: done ? t.toISOString() : null,
      completedAt: done ? t.add(SERVICE_MIN_PER_STOP, 'minute').toISOString() : null,
      status: done ? 'done' : 'pending',
      pallets,
      weightKg: pallets * (600 + Math.floor(rng() * 120)),
      deliveryNote: done
        ? {
            docNo: `DN-${70000 + counters.dn++}`,
            match: matched ? 'matched' : 'mismatch',
            mismatchField: matched ? null : pick(rng, ['quantity', 'quantity', 'consignee', 'docNo']),
          }
        : null,
    };
    t = t.add(SERVICE_MIN_PER_STOP, 'minute');
    prev = c;
    return stop;
  });
  km += roadKm(prev, DEPOT);
  const durationMin = t.diff(startAt, 'minute') + Math.round(driveMin(roadKm(prev, DEPOT)));
  const rerouted = rng() < 0.15;
  const routeVersions = [{ v: 1, at: startAt.toISOString(), reason: 'initial', km: Math.round(km) }];
  if (rerouted && status === 'completed') {
    routeVersions.push({ v: 2, at: startAt.add(70, 'minute').toISOString(), reason: 'delay_reroute', km: Math.round(km * 1.04) });
  }
  return {
    id,
    driverId: driver.id,
    truckId: driver.truckId,
    date: date.format('YYYY-MM-DD'),
    status,
    startedAt: startAt.toISOString(),
    completedAt: status === 'completed' ? startAt.add(durationMin, 'minute').toISOString() : null,
    bol: { docNo: `BL-${40000 + counters.bl++}`, shipperId: pick(rng, SHIPPERS).id },
    stops,
    routeVersions,
    km: Math.round(km),
    durationMin,
    progress,
  };
}

function eventsForTrip(trip, rng, counters, settings) {
  const out = [];
  const n = Math.floor(rng() * rng() * 4.2);
  for (let i = 0; i < n; i++) {
    const type = pick(rng, ['harsh_braking', 'harsh_braking', 'harsh_acceleration', 'speeding']);
    const stopCustomerId = pick(rng, trip.stops).customerId;
    const stop = CUSTOMERS.find((c) => c.id === stopCustomerId);
    const value =
      type === 'speeding'
        ? settings.speedThresholdKmh + 3 + Math.floor(rng() * 18)
        : +(type === 'harsh_braking' ? settings.harshBrakingG : settings.harshAccelG) + +(rng() * 0.25).toFixed(2);
    out.push({
      id: `E-${10000 + counters.ev++}`,
      tripId: trip.id,
      driverId: trip.driverId,
      truckId: trip.truckId,
      at: dayjs(trip.startedAt).add(20 + Math.floor(rng() * Math.max(30, trip.durationMin - 30)), 'minute').toISOString(),
      type,
      value: +(+value).toFixed(2),
      lat: (DEPOT.lat + stop.lat) / 2 + (rng() - 0.5) * 0.04,
      lng: (DEPOT.lng + stop.lng) / 2 + (rng() - 0.5) * 0.04,
    });
  }
  return out;
}

export function buildSeed(now = dayjs()) {
  const rng = mulberry32(20261019);
  const counters = { bl: 8100, dn: 2200, ev: 0, tr: 0 };
  const settings = { ...DEFAULT_SETTINGS };
  const trips = [];
  const events = [];
  const inspections = [];

  for (let d = 30; d >= 1; d--) {
    const date = now.subtract(d, 'day').startOf('day');
    if (!isWorkday(date)) continue;
    DRIVERS.forEach((driver) => {
      const truck = TRUCKS.find((t) => t.id === driver.truckId);
      const failed = INSPECTION_ITEMS.filter(() => rng() < 0.03);
      inspections.push({
        id: `I-${date.format('YYMMDD')}-${truck.id}`,
        truckId: truck.id,
        driverId: driver.id,
        date: date.format('YYYY-MM-DD'),
        at: date.hour(6).minute(40 + Math.floor(rng() * 15)).toISOString(),
        answers: Object.fromEntries(INSPECTION_ITEMS.map((k) => [k, !failed.includes(k)])),
        photo: failed.length > 0 || rng() < 0.2,
      });
      if (rng() > 0.85) return;
      const n = 2 + Math.floor(rng() * 3);
      const ids = [];
      while (ids.length < n) {
        const c = (rng() < 0.04 ? pick(rng, FAR) : pick(rng, NEAR)).id;
        if (!ids.includes(c)) ids.push(c);
      }
      const trip = buildTrip({
        id: `TR-${date.format('YYMMDD')}-${driver.id}`,
        driver,
        date,
        startAt: date.hour(7).minute(Math.floor(rng() * 50)),
        customerIds: ids,
        rng,
        counters,
      });
      trips.push(trip);
      events.push(...eventsForTrip(trip, rng, counters, settings));
    });
  }

  // One recent delivery note that does not match its bill of lading, for the review queue.
  const recentTrip = [...trips].reverse().find((t) => t.stops.length >= 2);
  recentTrip.stops[1].deliveryNote = { ...recentTrip.stops[1].deliveryNote, match: 'mismatch', mismatchField: 'quantity' };

  // Today: five drivers are on the road; the demo driver (1001) starts from the phone.
  const today = now.startOf('day');
  const liveSets = [['c4', 'c5'], ['c9', 'c8'], ['c10', 'c6'], ['c7', 'c11'], ['c12', 'c3']];
  DRIVERS.slice(1).forEach((driver, i) => {
    const progress = 0.25 + i * 0.12;
    const trip = buildTrip({
      id: `TR-${today.format('YYMMDD')}-${driver.id}`,
      driver,
      date: today,
      startAt: now.subtract(60 + i * 20, 'minute'),
      customerIds: liveSets[i],
      rng,
      counters,
      status: 'active',
      progress,
    });
    trips.push(trip);
    inspections.push({
      id: `I-${today.format('YYMMDD')}-${driver.truckId}`,
      truckId: driver.truckId,
      driverId: driver.id,
      date: today.format('YYYY-MM-DD'),
      at: today.hour(6).minute(45).toISOString(),
      answers: Object.fromEntries(INSPECTION_ITEMS.map((k) => [k, !(i === 2 && k === 'tires')])),
      photo: i === 2,
    });
  });

  // Review queue: recent documents with low-confidence fields, and the mismatched delivery notes.
  const recent = trips.filter((t) => t.status === 'completed').slice(-14);
  const reviews = {};
  [recent[1], recent[5], recent[9]].forEach((t, i) => {
    reviews[t.bol.docNo] = {
      status: 'needs_review',
      kind: 'bol',
      tripId: t.id,
      lowField: ['pallets_2', 'consignee_1', 'weight_total'][i],
      at: t.startedAt,
    };
  });
  trips
    .filter((t) => dayjs(t.date).isAfter(now.subtract(4, 'day')))
    .forEach((t) =>
      t.stops
        .filter((s) => s.deliveryNote?.match === 'mismatch')
        .forEach((s) => {
          reviews[s.deliveryNote.docNo] = { status: 'needs_review', kind: 'delivery_note', tripId: t.id, stopId: s.id, lowField: s.deliveryNote.mismatchField, at: s.completedAt };
        }),
    );

  const notifications = [
    { id: 'N-1', at: now.subtract(9, 'minute').toISOString(), type: 'harsh_braking', driverId: '1004', tripId: trips.find((t) => t.driverId === '1004' && t.status === 'active').id, read: false },
    { id: 'N-2', at: now.subtract(26, 'minute').toISOString(), type: 'delay', driverId: '1003', tripId: trips.find((t) => t.driverId === '1003' && t.status === 'active').id, delayMin: 14, read: false },
    { id: 'N-3', at: now.subtract(48, 'minute').toISOString(), type: 'review', docNo: Object.keys(reviews)[0], read: true },
    { id: 'N-4', at: now.subtract(75, 'minute').toISOString(), type: 'speeding', driverId: '1002', tripId: trips.find((t) => t.driverId === '1002' && t.status === 'active').id, value: 97, read: true },
  ];

  // Ituran and Pointer history: the reference period before the pilot (three full months).
  // Same delivery mix as the pilot, driven before route optimisation: longer routes and more fuel
  // per km, so the pilot lands near the 10% saving target.
  const reference = [];
  [3, 2, 1].forEach((m) => {
    const month = now.subtract(m, 'month').format('YYYY-MM');
    TRUCKS.forEach((truck) => {
      const own = trips.filter((t) => t.truckId === truck.id && t.status === 'completed');
      const kmPerDelivery = own.reduce((n, t) => n + t.km, 0) / Math.max(1, own.reduce((n, t) => n + t.stops.length, 0));
      const deliveries = 64 + Math.floor(rng() * 18);
      const km = Math.round(deliveries * kmPerDelivery * (1.06 + rng() * 0.03));
      reference.push({ month, truckId: truck.id, source: truck.tracker, km, liters: Math.round(km * (0.306 + rng() * 0.008)), deliveries });
    });
  });

  const eytamExports = [];
  for (let d = 14; d >= 1; d--) {
    const date = now.subtract(d, 'day');
    if (!isWorkday(date)) continue;
    const count = trips.filter((t) => t.date === date.format('YYYY-MM-DD')).reduce((n, t) => n + t.stops.length, 0);
    eytamExports.push({ id: `X-${date.format('YYMMDD')}`, date: date.format('YYYY-MM-DD'), at: date.hour(23).minute(30).toISOString(), deliveries: count, file: `eytam_deliveries_${date.format('YYYY-MM-DD')}.csv`, status: 'sent' });
  }

  // Orders waiting for the scheduling board (today and tomorrow).
  const orders = [];
  [0, 1].forEach((d) => {
    const date = now.add(d, 'day').format('YYYY-MM-DD');
    CUSTOMERS.slice(0, 9).forEach((c, i) => {
      if ((i + d) % 2 === 0 || i < 3) {
        orders.push({ id: `O-${date.slice(5).replace('-', '')}-${c.id}`, date, customerId: c.id, pallets: 2 + ((i * 3 + d) % 8), window: ['08:00-11:00', '10:00-13:00', '12:00-16:00'][i % 3], assignment: null });
      }
    });
  });

  return {
    version: SEED_VERSION,
    seededAt: now.toISOString(),
    settings,
    trips,
    events,
    inspections,
    reviews,
    notifications,
    reference,
    eytamExports,
    orders,
    plans: [],
    documents: {},
    nextId: 1,
  };
}
