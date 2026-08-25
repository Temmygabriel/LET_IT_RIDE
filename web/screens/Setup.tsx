import { useMemo, useState, type FormEvent } from "react";
import type { Asset, Direction, IntervalSec, Guardrails } from "../../src/types.ts";
import { evaluateGuardrails } from "../../src/rules.ts";
import { startRide, RUNNER_CONFIGURED } from "../api.ts";
import { money, assetLabel, intervalLabel } from "../format.ts";

/** Setup screen — pick the bet, then set the seatbelt (the real centerpiece). */
export function Setup({ onStarted }: { onStarted: (id: string) => void }) {
  const [asset, setAsset] = useState<Asset>("BTC");
  const [direction, setDirection] = useState<Direction>("UP");
  const [intervalSec, setIntervalSec] = useState<IntervalSec>(900);
  const [stake, setStake] = useState("50");

  const [useCashOut, setUseCashOut] = useState(true);
  const [cashOut, setCashOut] = useState("200");
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState("20");
  const [useMaxRounds, setUseMaxRounds] = useState(true);
  const [maxRounds, setMaxRounds] = useState("4");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stakeNum = Number(stake);
  const stakeValid = Number.isFinite(stakeNum) && stakeNum > 0;

  const guardrails = useMemo<Guardrails>(() => {
    const g: Guardrails = {};
    if (useCashOut && Number(cashOut) > 0) g.cashOutTarget = Number(cashOut);
    if (useStopLoss && Number(stopLoss) >= 0) g.stopLoss = Number(stopLoss);
    if (useMaxRounds && Math.floor(Number(maxRounds)) > 0) {
      g.maxRounds = Math.floor(Number(maxRounds));
    }
    return g;
  }, [useCashOut, cashOut, useStopLoss, stopLoss, useMaxRounds, maxRounds]);

  const hasGuardrail =
    guardrails.cashOutTarget !== undefined ||
    guardrails.stopLoss !== undefined ||
    guardrails.maxRounds !== undefined;

  // Reuse the ENGINE's own guardrail logic to preview a footgun: would a rule
  // trip before the first bet even lands? (e.g. cash-out set at/below stake.)
  const immediateStop = useMemo(() => {
    if (!stakeValid) return null;
    return evaluateGuardrails(guardrails, stakeNum, 0);
  }, [guardrails, stakeNum, stakeValid]);

  const canRide = stakeValid && hasGuardrail && !immediateStop && RUNNER_CONFIGURED && !submitting;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canRide) return;
    setSubmitting(true);
    setError(null);
    try {
      const { id } = await startRide({
        asset,
        direction,
        startStake: stakeNum,
        intervalSec,
        guardrails,
      });
      onStarted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="setup" onSubmit={(e) => void submit(e)}>
      <div className="card setup-bet">
        <h2 className="card-title">Your bet</h2>

        <label className="field-label">Asset</label>
        <div className="toggle-row">
          {(["BTC", "ETH"] as Asset[]).map((a) => (
            <button
              type="button"
              key={a}
              className={`toggle ${asset === a ? "on" : ""}`}
              onClick={() => setAsset(a)}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="field-label">Direction</label>
        <div className="toggle-row">
          <button
            type="button"
            className={`toggle toggle-up ${direction === "UP" ? "on" : ""}`}
            onClick={() => setDirection("UP")}
          >
            ▲ UP
          </button>
          <button
            type="button"
            className={`toggle toggle-down ${direction === "DOWN" ? "on" : ""}`}
            onClick={() => setDirection("DOWN")}
          >
            ▼ DOWN
          </button>
        </div>

        <label className="field-label">Window</label>
        <div className="toggle-row">
          {([900, 3600] as IntervalSec[]).map((s) => (
            <button
              type="button"
              key={s}
              className={`toggle ${intervalSec === s ? "on" : ""}`}
              onClick={() => setIntervalSec(s)}
            >
              {intervalLabel(s)}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="stake">
          Starting stake (tUSDC)
        </label>
        <input
          id="stake"
          className={`input ${stakeValid ? "" : "input-bad"}`}
          inputMode="decimal"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
        />
      </div>

      <div className="card setup-guardrails">
        <h2 className="card-title">
          Your seatbelt <span className="req">required</span>
        </h2>
        <p className="muted small">
          This is the point. Set how the ride ends <b>before</b> it starts, and it stops itself —
          hands-off. At least one is required.
        </p>

        <GuardrailField
          on={useCashOut}
          setOn={setUseCashOut}
          label="🎯 Cash-out target"
          hint="Bank it once the pot reaches…"
          value={cashOut}
          setValue={setCashOut}
          unit="tUSDC"
        />
        <GuardrailField
          on={useStopLoss}
          setOn={setUseStopLoss}
          label="🧱 Stop-loss"
          hint="Step out if the pot falls to…"
          value={stopLoss}
          setValue={setStopLoss}
          unit="tUSDC"
        />
        <GuardrailField
          on={useMaxRounds}
          setOn={setUseMaxRounds}
          label="🔁 Max rounds"
          hint="Never roll more than…"
          value={maxRounds}
          setValue={setMaxRounds}
          unit="rounds"
        />
      </div>

      <div className="card setup-preview">
        <h2 className="card-title">The plan</h2>
        {stakeValid ? (
          <p className="plan-text">
            You're staking <b>{money(stakeNum)}</b> that <b>{assetLabel(asset)}</b> finishes{" "}
            <b className={direction === "UP" ? "up" : "down"}>
              {direction === "UP" ? "▲ up" : "▼ down"}
            </b>{" "}
            over each <b>{intervalLabel(intervalSec)}</b> window. Win, and the <b>whole pot</b> rides
            into the next one — automatically.
          </p>
        ) : (
          <p className="plan-text muted">Enter a starting stake to see the plan.</p>
        )}

        {hasGuardrail ? (
          <p className="plan-text">
            It stops itself when{" "}
            {[
              guardrails.cashOutTarget !== undefined
                ? `the pot hits ${money(guardrails.cashOutTarget)}`
                : null,
              guardrails.stopLoss !== undefined
                ? `it drops to ${money(guardrails.stopLoss)}`
                : null,
              guardrails.maxRounds !== undefined
                ? `${guardrails.maxRounds} round${guardrails.maxRounds === 1 ? "" : "s"} are up`
                : null,
            ]
              .filter(Boolean)
              .join(", or ")}
            . You can also hit <b>Stop</b> any time.
          </p>
        ) : (
          <p className="plan-text warn-text">
            ⚠ Add at least one seatbelt above — Let It Ride won't run without one.
          </p>
        )}

        {immediateStop && (
          <p className="plan-text warn-text">
            ⚠ With these settings the ride would stop <b>immediately</b> ({labelForStop(immediateStop)}).
            Loosen the seatbelt so there's room to ride.
          </p>
        )}

        {!RUNNER_CONFIGURED && (
          <p className="plan-text warn-text">
            ⚠ No runner connected yet — set <code>VITE_RUNNER_URL</code> to start real rides.
          </p>
        )}

        {error && <p className="plan-text warn-text">⚠ {error}</p>}

        <button type="submit" className="btn btn-primary btn-big" disabled={!canRide}>
          {submitting ? "Buckling up…" : "Buckle up & ride →"}
        </button>
      </div>
    </form>
  );
}

/** One toggleable guardrail row: a checkbox, a label/hint, and a value input. */
function GuardrailField({
  on,
  setOn,
  label,
  hint,
  value,
  setValue,
  unit,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  label: string;
  hint: string;
  value: string;
  setValue: (v: string) => void;
  unit: string;
}) {
  return (
    <div className={`guardrail ${on ? "on" : ""}`}>
      <label className="guardrail-head">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span className="guardrail-label">{label}</span>
      </label>
      <div className="guardrail-body">
        <span className="guardrail-hint">{hint}</span>
        <div className="guardrail-input">
          <input
            className="input input-inline"
            inputMode="decimal"
            value={value}
            disabled={!on}
            onChange={(e) => setValue(e.target.value)}
          />
          <span className="unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function labelForStop(reason: string): string {
  if (reason === "CASH_OUT_TARGET") return "cash-out target already met";
  if (reason === "STOP_LOSS") return "stop-loss already at/above your stake";
  if (reason === "MAX_ROUNDS") return "max rounds is zero";
  return reason;
}
