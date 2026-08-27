import { useEffect, useState } from "react";
import { RUNNER_CONFIGURED, listRides } from "./api.ts";
import { useRide } from "./useRide.ts";
import { isTerminalPhase } from "./format.ts";
import { WalletStrip } from "./components/WalletStrip.tsx";
import { Banner, Loading } from "./components/ui.tsx";
import { Setup } from "./screens/Setup.tsx";
import { LiveRide } from "./screens/LiveRide.tsx";
import { Summary } from "./screens/Summary.tsx";
import { ShareCard } from "./screens/ShareCard.tsx";

/**
 * The whole app is a tiny state machine driven by one question: is there a ride?
 *   no ride        → Setup
 *   ride, live     → LiveRide (polled by useRide)
 *   ride, finished → Summary
 * The runner owns the money and the loop; this is a thin client over it.
 */
export default function App() {
  // A shared ride card is a standalone, runner-free view. Route to it before any
  // ride hooks run. The path is fixed for the page's lifetime, so this early
  // return is stable across renders (no Rules-of-Hooks violation).
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/share")) {
    return <ShareCard />;
  }

  const [rideId, setRideId] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const { state, error, stopping, stop } = useRide(rideId);

  // On load, ask the runner whether a ride is already in flight (e.g. the user
  // closed the tab and came back — the runner kept riding). If so, drop into it.
  useEffect(() => {
    if (!RUNNER_CONFIGURED) {
      setBooted(true);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const { rides } = await listRides();
        const active = rides.find((r) => !isTerminalPhase(r.state.phase));
        if (alive && active) setRideId(active.id);
      } catch {
        /* no runner / no rides — just show setup */
      } finally {
        if (alive) setBooted(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const reset = () => setRideId(null);

  let screen;
  if (!booted) {
    screen = <Loading label="Checking for a ride in progress…" />;
  } else if (!rideId) {
    screen = <Setup onStarted={setRideId} />;
  } else if (!state) {
    screen = <Loading label="Loading your ride…" />;
  } else if (isTerminalPhase(state.phase)) {
    screen = <Summary state={state} onReset={reset} />;
  } else {
    screen = <LiveRide state={state} onStop={() => void stop()} stopping={stopping} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={reset} title="Back to start">
          <span className="brand-mark">🎢</span>
          <span className="brand-name">Let It Ride</span>
        </button>
        <WalletStrip />
      </header>

      {!RUNNER_CONFIGURED && (
        <Banner tone="warn">
          No runner connected yet — set <code>VITE_RUNNER_URL</code> to start real rides.
        </Banner>
      )}

      {error && rideId && (
        <Banner tone="warn">Connection hiccup — retrying… ({error})</Banner>
      )}

      <main className="stage">{screen}</main>

      <footer className="footer">
        <span className="tagline">We productize restraint. The seatbelt is the hero.</span>
      </footer>
    </div>
  );
}
