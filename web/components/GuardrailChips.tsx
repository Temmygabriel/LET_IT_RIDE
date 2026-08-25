import type { Guardrails } from "../../src/types.ts";
import { money } from "../format.ts";

/** The active seatbelts, shown as calm reassurance chips (live + summary). */
export function GuardrailChips({ guardrails }: { guardrails: Guardrails }) {
  const chips: string[] = [];
  if (guardrails.cashOutTarget !== undefined) {
    chips.push(`🎯 Auto cash-out at ${money(guardrails.cashOutTarget)}`);
  }
  if (guardrails.stopLoss !== undefined) {
    chips.push(`🧱 Stop-loss at ${money(guardrails.stopLoss)}`);
  }
  if (guardrails.maxRounds !== undefined) {
    chips.push(`🔁 Max ${guardrails.maxRounds} round${guardrails.maxRounds === 1 ? "" : "s"}`);
  }
  if (chips.length === 0) return null;

  return (
    <div className="chips">
      {chips.map((c) => (
        <span key={c} className="chip">
          {c}
        </span>
      ))}
    </div>
  );
}
