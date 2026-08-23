// Pure decision logic for a ride — no SDK, no network, no clock, no I/O.
// Everything here is a plain function of numbers and the ride's own types, so
// the engine, the frontend (to preview what a ride will do), and the Worker
// can all share the exact same rules with zero risk of drift.

import type { Direction, Guardrails, StopReason } from "./types";

// A binary window has two outcomes. The chain numbers them:
//   YES = outcome 0 = "price finished UP"
//   NO  = outcome 1 = "price finished DOWN"
export const OUTCOME_YES = 0 as const;
export const OUTCOME_NO = 1 as const;

/** The outcome index a direction is betting on. UP → YES(0), DOWN → NO(1). */
export function outcomeForDirection(direction: Direction): 0 | 1 {
  return direction === "UP" ? OUTCOME_YES : OUTCOME_NO;
}

/** The BUY side we send to the order book for a direction. */
export function buySideForDirection(
  direction: Direction,
): "BUY_YES" | "BUY_NO" {
  return direction === "UP" ? "BUY_YES" : "BUY_NO";
}

/**
 * Did our bet win? Only meaningful once the window has RESOLVED and did NOT
 * void. `winningOutcome` is the chain's verdict (0 = Up won, 1 = Down won);
 * we win when it matches the outcome our direction was holding.
 */
export function didWin(direction: Direction, winningOutcome: 0 | 1): boolean {
  return outcomeForDirection(direction) === winningOutcome;
}

/**
 * The next stake. "Let it ride" means the WHOLE pot rides into the next
 * window — original stake plus everything won so far. (Kept as a function so
 * a future "ride only the profit" mode is a one-line change here.)
 */
export function nextStake(pot: number): number {
  return pot;
}

/**
 * Check the seatbelts BEFORE starting another round. Returns the reason to
 * stop, or null to keep riding.
 *
 * @param pot              current bankroll (what the next bet would stake)
 * @param roundsCompleted  how many windows have been fully ridden so far
 *
 * Priority: bank a win first (cashOutTarget), then protect the floor
 * (stopLoss), then respect the round cap (maxRounds). In this all-or-nothing
 * game the pot only ratchets up on a win or falls to ~0 on a loss (a loss ends
 * the ride on its own as LOST), so cashOutTarget and maxRounds are the
 * everyday stops; stopLoss is the floor that also guards any future
 * partial-cashout mode.
 */
export function evaluateGuardrails(
  guardrails: Guardrails,
  pot: number,
  roundsCompleted: number,
): StopReason | null {
  const { cashOutTarget, stopLoss, maxRounds } = guardrails;

  if (cashOutTarget !== undefined && pot >= cashOutTarget) {
    return "CASH_OUT_TARGET";
  }
  if (stopLoss !== undefined && pot <= stopLoss) {
    return "STOP_LOSS";
  }
  if (maxRounds !== undefined && roundsCompleted >= maxRounds) {
    return "MAX_ROUNDS";
  }
  return null;
}
