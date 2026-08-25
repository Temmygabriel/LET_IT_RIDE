// The beat driver — the bridge between the cron/API and the shared engine.
//
// A cron fire (or an API kick) is a cold start: there is no long-lived engine in
// memory. So every beat we (1) read the ride's state from KV, (2) open one
// exchange + attach the ride wallet, (3) rebuild the engine with RideEngine.resume,
// (4) step() once, and (5) write the state back only if it meaningfully changed.
// The chain stays the source of truth for win/loss/void, so resuming mid-ride is
// always correct even though nothing but RideState was persisted.

import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { connect, attachRideWallet } from "../src/exchange.ts";
import { RideEngine } from "../src/engine.ts";
import type { RideState } from "../src/types.ts";
import { ridePrivateKey } from "./wallet.ts";
import {
  getRide,
  listRides,
  isActive,
  saveIfChanged,
  rideSignature,
} from "./store.ts";

/** One beat for one ride on an already-connected exchange. Never throws. */
async function stepRide(
  exchange: SomniaMarkets,
  kv: Deno.Kv,
  id: string,
  state: RideState,
): Promise<RideState> {
  // Capture the "before" fingerprint as a STRING now: resume() seeds the engine
  // with this very object and then mutates it in place, so a reference compare
  // after step() would always look unchanged. The string snapshot is immune.
  const beforeSig = rideSignature(state);
  const engine = RideEngine.resume(exchange, state);
  await engine.step();
  await saveIfChanged(kv, id, beforeSig, engine.state);
  return engine.state;
}

/**
 * Tick EVERY active ride once. This is what the cron calls. All rides share the
 * single capped ride wallet, so they run sequentially on one exchange/WebSocket
 * that we open once and always close. A failure on one ride is logged and
 * skipped so it can never stall the others.
 */
export async function tickAll(kv: Deno.Kv): Promise<void> {
  const rides = (await listRides(kv)).filter((r) => isActive(r.state));
  if (rides.length === 0) return;

  const exchange = connect();
  try {
    attachRideWallet(exchange, ridePrivateKey());
    for (const { id, state } of rides) {
      try {
        await stepRide(exchange, kv, id, state);
      } catch (err) {
        console.error(`tick ${id} failed:`, err);
      }
    }
  } finally {
    exchange.close();
  }
}

/**
 * Tick ONE ride once, on its own fresh connection. Used for the snappy first
 * beat right after `POST /ride` so the UI sees PLACING immediately instead of
 * waiting up to two minutes for the next cron. Returns the new state, the
 * unchanged state if the ride is already finished, or null if unknown.
 */
export async function tickRide(
  kv: Deno.Kv,
  id: string,
): Promise<RideState | null> {
  const state = await getRide(kv, id);
  if (!state) return null;
  if (!isActive(state)) return state;

  const exchange = connect();
  try {
    attachRideWallet(exchange, ridePrivateKey());
    return await stepRide(exchange, kv, id, state);
  } finally {
    exchange.close();
  }
}
