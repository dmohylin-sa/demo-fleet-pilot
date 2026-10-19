// The mocked backend's "database" plus the demo's own UI state, in one zustand store.
// UI code never writes to `db` directly: it goes through api.js, as it would against a real API.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { buildSeed, SEED_VERSION } from './seed.js';

const STORAGE_KEY = 'trafixct-pilot-demo';

// localStorage writes are debounced: the fleet simulation updates the store every few seconds.
const debouncedStorage = (() => {
  let timer = null;
  let pending = null;
  return {
    getItem: (name) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = [name, value];
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(...pending);
        } catch {
          /* storage full or blocked: the demo keeps working in memory */
        }
      }, 800);
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
})();

const initialPhone = () => ({
  session: null, // { driverId, token }
  shift: null, // { startedAt }
  activeTripId: null,
  position: null, // { lat, lng, at } of the demo truck
  offline: false,
  locked: false,
  queue: [], // offline queue: [{ id, action, payload, at }]
  pushes: [], // push notifications shown on the phone: [{ id, alertId, type, delayMin, at }]
  syncResults: {}, // results of queued calls, by queue id, once synced
  flaky: false, // weak signal: the next photo upload fails once
  lastScannedDocId: null,
});

const initialDemo = () => ({
  phase: 'all', // 'p1' | 'golive' | 'all'
  lang: 'en',
  consoleSignedIn: false,
});

export const useStore = create(
  persist(
    immer((set, get) => ({
      db: buildSeed(),
      phone: initialPhone(),
      demo: initialDemo(),
      apiLog: [],

      mutate: (fn) => set((s) => void fn(s)),

      logCall: (entry) =>
        set((s) => {
          s.apiLog.unshift(entry);
          if (s.apiLog.length > 120) s.apiLog.length = 120;
        }),

      setPhase: (phase) => set((s) => void (s.demo.phase = phase)),
      setLang: (lang) => set((s) => void (s.demo.lang = lang)),

      resetDemo: () =>
        set((s) => {
          const lang = s.demo.lang;
          const phase = s.demo.phase;
          s.db = buildSeed();
          s.phone = initialPhone();
          s.demo = { ...initialDemo(), lang, phase };
          s.apiLog = [];
        }),
    })),
    {
      name: STORAGE_KEY,
      version: SEED_VERSION,
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ db: s.db, phone: s.phone, demo: s.demo }),
      // A new seed version or a seed from an earlier day starts the demo fresh.
      migrate: () => ({ db: buildSeed(), phone: initialPhone(), demo: initialDemo() }),
      merge: (persisted, current) => {
        if (!persisted?.db?.seededAt) return current;
        const seededDay = persisted.db.seededAt.slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (seededDay !== today) return current;
        return { ...current, ...persisted };
      },
    },
  ),
);

export const getState = () => useStore.getState();

// Handy for poking at the demo from the browser console during development.
if (import.meta.env.DEV) window.__demoStore = useStore;
