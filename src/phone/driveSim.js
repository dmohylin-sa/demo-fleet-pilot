// Demo harness: drives the demo truck from its position to the next stop. The app reports each
// position to the backend, as it does on the road.
import { useStore } from '../mock-backend/store.js';
import { DEPOT, CUSTOMERS } from '../mock-backend/seed.js';
import { segmentPath } from '../mock-backend/geo.js';
import { run, effectiveStopStatus } from './phoneApi.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let driving = false;

export const isDriving = () => driving;

export async function driveToNextStop() {
  const s = useStore.getState();
  const tripId = s.phone.activeTripId;
  if (!tripId || driving) return false;
  const trip = s.db.trips.find((t) => t.id === tripId);
  const next = trip?.stops.find((st) => effectiveStopStatus(st, s.phone.queue) === 'pending');
  if (!next) return false;
  const c = CUSTOMERS.find((x) => x.id === next.customerId);
  const to = { lat: next.lat ?? c.lat, lng: next.lng ?? c.lng };
  const from = s.phone.position || s.db.livePositions?.t1 || DEPOT;
  const path = segmentPath(from, to, 16, 0.05);
  driving = true;
  try {
    for (let i = 1; i < path.length; i++) {
      const [lat, lng] = path[i];
      await run('reportPosition', tripId, { lat, lng });
      await sleep(260);
    }
  } finally {
    driving = false;
  }
  return true;
}
