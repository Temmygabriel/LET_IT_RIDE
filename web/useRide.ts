// Polls one ride's live state from the runner until it ends, then stops. The
// runner's cron is what actually advances the ride; this just watches it.

import { useCallback, useEffect, useState } from "react";
import type { RideState } from "../src/types.ts";
import { getRide, stopRide } from "./api.ts";
import { isTerminalPhase } from "./format.ts";

const POLL_OK_MS = 4000;
const POLL_ERR_MS = 6000;

export interface UseRide {
  state: RideState | null;
  error: string | null;
  stopping: boolean;
  stop: () => Promise<void>;
}

export function useRide(id: string | null): UseRide {
  const [state, setState] = useState<RideState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (!id) {
      setState(null);
      setError(null);
      return;
    }

    let alive = true;
    let timer: number | undefined;

    const poll = async (): Promise<void> => {
      try {
        const { state: next } = await getRide(id);
        if (!alive) return;
        setState(next);
        setError(null);
        // Keep watching only while the ride is still doing something.
        if (!isTerminalPhase(next.phase)) {
          timer = window.setTimeout(poll, POLL_OK_MS);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        timer = window.setTimeout(poll, POLL_ERR_MS);
      }
    };

    void poll();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [id]);

  const stop = useCallback(async () => {
    if (!id) return;
    setStopping(true);
    try {
      const { state: next } = await stopRide(id);
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStopping(false);
    }
  }, [id]);

  return { state, error, stopping, stop };
}
