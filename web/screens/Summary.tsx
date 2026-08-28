import { useState } from "react";
import type { RideState } from "../../src/types.ts";
import { outcomeLook, money, directionLook, assetLabel, buildShareUrl } from "../format.ts";
import { GuardrailChips } from "../components/GuardrailChips.tsx";

/** The recap. Frames the ending honestly — a disciplined exit is the celebrated win. */
export function Summary({ state, onReset }: { state: RideState; onReset: () => void }) {
  const { config } = state;
  const outcome = outcomeLook(state.stopReason);
  const dir = directionLook(config.direction);

  const net = state.pot - config.startStake;
  const up = net >= 0;
  const isError = state.phase === "ERROR";

  // The share card reads a status token: "error", or the lowercased stop reason.
  const status = isError ? "error" : (state.stopReason ?? "ended").toLowerCase();

  // A plain-language, real-numbers recap so anyone gets what just happened.
  const wonWord = state.round === 1 ? "window" : "windows";
  const plain = isError
    ? ""
    : state.round === 0
      ? state.stopReason === "USER_STOP"
        ? `You stopped during your very first window — nothing rolled yet, so you keep what you put in.`
        : `Your very first window didn't land, so the ride ended right away. You only ever risked your ${money(config.startStake)} start.`
      : state.stopReason === "LOST"
        ? `You won ${state.round} ${wonWord} in a row — then the next one didn't land. A lost window ends the ride, so there's nothing left to roll. You never risked more than your ${money(config.startStake)} start.`
        : `You let ${money(config.startStake)} ride through ${state.round} winning ${wonWord} in a row and it grew to ${money(state.pot)}. Then your seatbelt banked it — exactly as you set it up.`;

  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = buildShareUrl({
      asset: config.asset,
      dir: config.direction,
      round: state.round,
      start: config.startStake,
      pot: state.pot,
      status,
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <div className="summary">
      <div className={`card summary-card tone-${outcome.tone}`}>
        <div className="summary-emoji">{isError ? "🔧" : outcome.emoji}</div>
        <h2 className="summary-headline">
          {isError ? "The ride hit a snag" : outcome.headline}
        </h2>
        <p className="summary-blurb">
          {isError
            ? "Something interrupted the loop. Your funds are on-chain and safe — you can start a fresh ride."
            : outcome.blurb}
        </p>

        {plain && <p className="summary-plain">{plain}</p>}

        {isError && state.lastError && (
          <p className="summary-error">{state.lastError}</p>
        )}

        <div className="summary-stats">
          <div className="stat">
            <span className="stat-k">Ended with</span>
            <span className="stat-v">{money(state.pot)}</span>
          </div>
          <div className="stat">
            <span className="stat-k">{up ? "Profit" : "Loss"}</span>
            <span className={`stat-v ${up ? "up" : "down"}`}>
              {up ? "+" : "−"}
              {money(Math.abs(net))}
            </span>
          </div>
          <div className="stat">
            <span className="stat-k">Windows won</span>
            <span className="stat-v">{state.round}</span>
          </div>
        </div>

        <div className="summary-recap">
          <span className={`dir-pill ${dir.tone}`}>
            {dir.arrow} {config.asset} {dir.word}
          </span>
          <span className="muted small">
            Started at {money(config.startStake)} on {assetLabel(config.asset)}
          </span>
        </div>

        <GuardrailChips guardrails={config.guardrails} />

        <button className="btn btn-primary btn-big" onClick={onReset}>
          Ride again →
        </button>
        <button className="btn btn-ghost btn-sm share-btn" onClick={() => void share()}>
          {copied ? "✓ Link copied" : "↗ Share this result"}
        </button>
      </div>
    </div>
  );
}
