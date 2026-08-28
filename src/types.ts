// The shape of a ride and its live state. Pure data — no SDK imports — so this
// module is trivially shared between the engine, the frontend, and the Worker.

/** The only assets Event Contracts cover. */
export type Asset = "BTC" | "ETH";

/** Which way the user is betting the price will move over the window. */
export type Direction = "UP" | "DOWN";

/**
 * Window length in seconds. Let It Ride uses the 15-minute and 1-hour windows.
 * (SDK exposes these as intervalSec numbers: 900 and 3600.)
 */
export type IntervalSec = 900 | 3600;

/** The seatbelt. Any combination can be set; the engine checks them before every roll. */
export interface Guardrails {
  /** Stop and bank once the pot reaches this many collateral units (human, e.g. tUSDC). */
  cashOutTarget?: number;
  /** Stop if the pot falls to or below this floor. */
  stopLoss?: number;
  /** Never roll more than this many times. */
  maxRounds?: number;
}

/** Everything needed to start a ride. Set once, up front. */
export interface RideConfig {
  asset: Asset;
  direction: Direction;
  /** Starting stake in human collateral units (e.g. 50 = 50 tUSDC). */
  startStake: number;
  intervalSec: IntervalSec;
  /** DreamDEX venue/operator hosting these windows (live markets sit on operatorId 2). */
  operatorId: number;
  guardrails: Guardrails;
  /** Optional builder-fee routing (our monetization) — the app's address. */
  builder?: `0x${string}`;
  /** Builder fee in bps × 1000 (SDK units); capped per pool by getMaxBuilderFeeBpsTimes1k. */
  builderFeeBpsTimes1k?: bigint;
}

/** Where the ride is in its cycle. */
export type RidePhase =
  | "IDLE" // configured but not started
  | "PLACING" // submitting an order for the current window
  | "HOLDING" // in a position, waiting for the window to settle
  | "CLAIMING" // redeeming winnings from a settled window
  | "ROLLING" // applying guardrails + sizing the next bet
  | "STOPPED" // ended cleanly (see stopReason)
  | "ERROR"; // needs attention (see lastError)

/** Why a ride ended. */
export type StopReason =
  | "CASH_OUT_TARGET" // hit the target and banked it
  | "STOP_LOSS" // dropped to the floor
  | "MAX_ROUNDS" // rolled the maximum number of times
  | "USER_STOP" // the user pressed Stop
  | "LOST" // the last window lost — nothing left to roll
  | "VOID_EXIT"; // window voided; redeemed the half-back and stopped

/** Live snapshot of a ride. The chain is the source of truth; this is the app's view of it. */
export interface RideState {
  config: RideConfig;
  phase: RidePhase;
  /** How many windows ridden so far. */
  round: number;
  /** Current bankroll in human collateral units — what the next bet will stake. */
  pot: number;
  /** marketId of the window we're currently in (null between rounds). */
  currentMarketId: string | null;
  /** Unix seconds. */
  startedAt: number;
  /** Unix seconds. */
  updatedAt: number;
  stopReason?: StopReason;
  lastError?: string;
  /**
   * Set when the user presses Stop. Persisted here (not just in engine memory)
   * so a Worker that resumes a ride from this state still honours the request:
   * the current window is banked, then the ride halts instead of rolling on.
   */
  stopRequested?: boolean;
  /**
   * Unix seconds when we entered the CURRENT holding window. A safety-net clock:
   * if a window never settles (a stuck market), the engine uses this to end the
   * ride cleanly instead of polling forever — the runaway that once pinned
   * server usage. Re-stamped every time a fresh window is entered (see engine).
   */
  heldSince?: number;
  /**
   * Collateral already in the ride wallet at the first bet that isn't part of
   * this ride (≈0 on a dedicated wallet; the other funds on the shared demo
   * wallet). Captured once, then the pot is (walletBalance − baseline) so it
   * reflects only this ride's stake + winnings — not the entire wallet.
   */
  baselineCollateral?: number;
  /**
   * Unix seconds when we first found NO open window while trying to place a bet.
   * A momentary gap between windows is normal (they rotate every intervalSec), so
   * the engine stays IDLE and retries next tick instead of failing. This clock
   * bounds that wait: if it runs far past a couple of windows, the ride gives up
   * with a clear message rather than waiting forever. Cleared the moment a
   * tradeable window is found. (Persisted like heldSince — see store.ts.)
   */
  waitingSince?: number;
}
