import { useEffect, useState, useCallback } from 'react';
import { db } from './db';

/** Runs an async db read and re-runs it whenever the store changes. */
export function useDbQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let alive = true;
    const load = () =>
      run().then(
        (v) => alive && setData(v),
        (e: Error) => alive && setError(e),
      );
    load();
    const off = db.subscribe(load);
    return () => {
      alive = false;
      off();
    };
  }, [run]);
  return { data, error, loading: data === undefined && !error };
}
