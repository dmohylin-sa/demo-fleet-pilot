// The driver app's client layer over the mocked backend. Phase 2 adds the offline queue: without
// signal, photos and trip actions are kept on the phone and sent in order when the signal returns.
// Positions are buffered by the tracking task, so only the latest one is kept.
import * as api from '../mock-backend/api.js';
import { useStore } from '../mock-backend/store.js';

const S = () => useStore.getState();
const mutate = (fn) => S().mutate(fn);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUEUEABLE = new Set(['uploadPhoto', 'arriveStop', 'completeStop', 'postDrivingEvent', 'deliveryNote', 'reportPosition']);

function enqueue(action, args) {
  let entry;
  mutate((s) => {
    if (action === 'reportPosition') {
      const last = s.phone.queue.find((q) => q.action === 'reportPosition');
      if (last) {
        last.args = args;
        last.count = (last.count || 1) + 1;
        entry = { id: last.id };
        return;
      }
    }
    entry = { id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action, args, at: new Date().toISOString(), count: 1 };
    s.phone.queue.push(entry);
  });
  return entry;
}

export async function run(action, ...args) {
  if (S().phone.offline) {
    if (action === 'reportPosition') mutate((s) => void (s.phone.position = args[1]));
    if (QUEUEABLE.has(action)) return { queued: true, queueId: enqueue(action, args).id };
    const err = new Error('offline');
    err.code = 'offline';
    throw err;
  }
  if (action === 'uploadPhoto' && S().phone.flaky) {
    mutate((s) => void (s.phone.flaky = false));
    await sleep(1100);
    S().logCall({ id: `${Date.now()}-x`, at: new Date().toISOString(), method: 'POST', path: '/documents/upload', ms: 1100, status: 504, error: 'network_timeout' });
    const err = new Error('network');
    err.code = 'network';
    throw err;
  }
  if (action === 'deliveryNote') {
    const [tripId, stopId, paperDocNo] = args;
    const { documentId } = await api.uploadPhoto({ kind: 'delivery_note', tripId, stopId, paperDocNo });
    return api.submitDeliveryNote(tripId, stopId, documentId);
  }
  return api[action](...args);
}

export async function setOffline(offline) {
  mutate((s) => void (s.phone.offline = offline));
  if (offline) return 0;
  return flushQueue();
}

export async function flushQueue() {
  const queue = [...S().phone.queue];
  let synced = 0;
  for (const entry of queue) {
    if (S().phone.offline) break;
    let result = null;
    try {
      result = await run(entry.action, ...entry.args);
    } catch {
      result = { error: true };
    }
    mutate((s) => {
      s.phone.queue = s.phone.queue.filter((q) => q.id !== entry.id);
      s.phone.syncResults[entry.id] = result;
    });
    synced += 1;
  }
  return synced;
}

// A stop's status as the driver sees it: queued actions count before they reach the backend.
export function effectiveStopStatus(stop, queue) {
  if (queue.some((q) => q.action === 'completeStop' && q.args[1] === stop.id)) return 'done';
  if (queue.some((q) => q.action === 'arriveStop' && q.args[1] === stop.id) && stop.status === 'pending') return 'arrived';
  return stop.status;
}

export const noteQueued = (stopId, queue) => queue.some((q) => q.action === 'deliveryNote' && q.args[1] === stopId);
