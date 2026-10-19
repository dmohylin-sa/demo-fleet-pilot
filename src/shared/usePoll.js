import { useCallback, useEffect, useRef, useState } from 'react';

// Calls an async loader now, whenever `deps` change, and every `intervalMs` (0 = no polling).
// Polling stands in for what the pilot does for real: the console list refreshes every 30-60 s
// and the trip screen checks for delay alerts every 30 s. The demo polls faster.
export function usePoll(loader, deps = [], intervalMs = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refresh = useCallback(async () => {
    try {
      const res = await loaderRef.current();
      if (alive.current) {
        setData(res);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    refresh();
    if (!intervalMs) return () => void (alive.current = false);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refresh, setData };
}
