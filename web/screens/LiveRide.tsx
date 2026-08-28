import { useState } from "react";
import type { RideState } from "../../src/types.ts";
import {
  phaseLook,
  directionLook,
  money,
  assetLabel,
  intervalLabel,
  buildShareUrl,
} from "../format.ts";
import { GuardrailChips } from "../components/GuardrailChips.tsx";
import { Spinner } from "../components/ui.tsx";

/** The live ride: bold phase readout, growing pot, and an always-available Stop. */
export function LiveRide({
  state,
  onStop,
  stopping,
}: {
  state: RideState;
  onStop: () => void;
  stopping: boolean;
}) {
  const { config } = state;
  const dir = directionLook(config.direction);
  const look = phaseLook(state.phase);

  const delta = state.pot - config.startStake;
  const up = delta >= 0;
  const mult = config.startStake > 0 ? state.pot / config.startStake : 0;

  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = buildShareUrl({
      asset: config.asset,
      dir: config.direction,
      round: state.round,
      start: config.startStake,
      pot: state.pot,
      status: "riding",
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context) — open the card so they can copy the address bar.
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <div className="live">
      <div className="card live-hero">
        <div className={`dir-badge ${dir.tone}`}>
          <span className="dir-arrow">{dir.arrow}</span>
          <span className="dir-text">
            {config.asset} {dir.word}
          </span>
        </div>

        <div className="phase">
          <div className="phase-label">
            {look.busy && <Spinner />} {look.label}
          </div>
          {look.hint && <div className="phase-hint">{look.hint}</div>}
        </div>

        <div className="pot">
          <div className="pot-label">Pot riding</div>
          <div className="pot-value">{money(state.pot)}</div>
          <div className={`pot-delta ${up ? "up" : "down"}`}>
            {up ? "▲" : "▼"} {money(Math.abs(delta))} {up ? "up" : "down"} from {money(config.startStake)}
          </div>
        </div>

        {state.round >= 1 && (
          <div className="streak-line">
            🔥 {state.round} win{state.round === 1 ? "" : "s"} in a row · pot is {mult.toFixed(mult >= 10 ? 0 : 1)}× your start
          </div>
        )}

        <p className="ride-how muted small">
          {state.round === 0
            ? "You're on your first window. Win it and your whole pot rolls straight into the next one — hands-off. Lose it and the ride ends here."
            : "Each win rolls your whole pot into the next window on its own. It keeps going until a seatbelt stops it — or a window doesn't land."}
        </p>

        <div className="live-meta">
          <div className="meta-cell">
            <span className="meta-k">Windows won</span>
            <span className="meta-v">{state.round}</span>
          </div>
          <div className="meta-cell">
            <span className="meta-k">Window</span>
            <span className="meta-v">{intervalLabel(config.intervalSec)}</span>
          </div>
          <div className="meta-cell">
            <span className="meta-k">Betting on</span>
            <span className="meta-v">{assetLabel(config.asset)}</span>
          </div>
        </div>

        <button className="btn btn-ghost btn-sm share-btn" onClick={() => void share()}>
          {copied ? "✓ Link copied" : "↗ Share this ride"}
        </button>
      </div>

      <div className="card live-guard">
        <div className="live-guard-head">Your seatbelt is on</div>
        <p className="muted small">
          This ride stops itself the moment any of these is met — you don't have to watch it.
        </p>
        <GuardrailChips guardrails={config.guardrails} />

        <button className="btn btn-stop btn-big" onClick={onStop} disabled={stopping}>
          {stopping ? "Stopping after this window…" : "Stop the ride"}
        </button>
        <p className="muted tiny">
          Stop banks the current window, then halts — it won't yank you out mid-bet.
        </p>
      </div>
    </div>
  );
}
