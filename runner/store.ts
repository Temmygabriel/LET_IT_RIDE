// Persistence for rides — Deno KV, one RideState JSON per ride id.
//
// The cron rebuilds an engine from this state every tick (a cron fire is a cold
// start), so KV IS the ride's memory between beats. The chain remains the source
// of truth for win/loss/void; this only stores the app's view of a ride.

import type { RideState } from "../src/types.ts";

/** Every ride lives under ["ride", id]. */
const RIDE = "ride";

/** Read one ride's state, or null if we've never heard of it. */
export async function getRide(
  kv: Deno.Kv,
  id: string,
): Promise<RideState | null> {
  const res = await kv.get<RideState>([RIDE, id]);
  return res.value;
}

/** Write a ride's state (unconditionally). */
export async function putRide(
  kv: Deno.Kv,
  id: string,
  state: RideState,
): Promise<void> {
  await kv.set([RIDE, id], state);
}

/** Every ride we know about, most-recently-active first. */
export async function listRides(
  kv: Deno.Kv,
): Promise<Array<{ id: string; state: RideState }>> {
  const out: Array<{ id: string; state: RideState }> = [];
  for await (const entry of kv.list<RideState>({ prefix: [RIDE] })) {
    const id = entry.key[entry.key.length - 1] as string;
    out.push({ id, state: entry.value });
  }
  out.sort((a, b) => b.state.updatedAt - a.state.updatedAt);
  return out;
}

/** A ride still doing work — the cron only needs to tick these. */
export function isActive(state: RideState): boolean {
  return state.phase !== "STOPPED" && state.phase !== "ERROR";
}

/**
 * A fingerprint of the fields that actually matter for persistence. `updatedAt`
 * is deliberately EXCLUDED: the engine bumps it on every beat (even a no-op
 * HOLDING poll while a 15-minute window ticks along), and writing KV every tick
 * would burn the free-tier write budget. We persist only when something a human
 * would notice — a phase change, a new pot, a stop — actually changed.
 */
export function rideSignature(s: RideState): string {
  return JSON.stringify({
    phase: s.phase,
    round: s.round,
    pot: s.pot,
    currentMarketId: s.currentMarketId,
    stopReason: s.stopReason ?? null,
    lastError: s.lastError ?? null,
    stopRequested: s.stopRequested ?? false,
    // Included so the HOLDING settle-timeout clock actually persists between
    // cron ticks (it's set on a stay-put beat that changes nothing else).
    heldSince: s.heldSince ?? null,
  });
}

/**
 * Write the ride back ONLY if its meaningful state changed since `beforeSig`
 * (captured before the beat ran). Returns true if a write happened.
 */
export async function saveIfChanged(
  kv: Deno.Kv,
  id: string,
  beforeSig: string,
  after: RideState,
): Promise<boolean> {
  if (rideSignature(after) === beforeSig) return false;
  await putRide(kv, id, after);
  return true;
}
