// The HTTP API the frontend talks to. Pure request→response routing over KV +
// the shared engine; no long-lived state lives here (the cron owns the loop).
//
// Endpoints:
//   GET  /            → service info (safe without a wallet key)
//   GET  /health      → liveness probe
//   GET  /wallet      → ride-wallet address + tUSDC/STT balances (for the UI)
//   POST /faucet      → mint testnet tUSDC to the ride wallet
//   POST /ride        → start a ride (validate config, 409 if one is active)
//   GET  /rides       → list every ride we know about
//   GET  /ride/:id    → one ride's live state
//   POST /ride/:id/stop → ask a ride to stop after banking the current window

import {
  createPublicClient,
  http,
  formatUnits,
  formatEther,
} from "viem";
import { somniaTestnet, RPC_URL, ADDRESSES, OPERATOR_ID } from "../src/config.ts";
import { connect, attachRideWallet } from "../src/exchange.ts";
import { initialRideState } from "../src/engine.ts";
import type {
  RideConfig,
  RideState,
  Guardrails,
  IntervalSec,
} from "../src/types.ts";
import { rideAddress, ridePrivateKey } from "./wallet.ts";
import { getRide, putRide, listRides, isActive } from "./store.ts";
import { tickRide } from "./run.ts";

// One-shot balance reads don't need the WebSocket transport the engine uses, so
// a plain HTTP public client keeps the /wallet endpoint cheap and independent.
const pub = createPublicClient({
  chain: somniaTestnet,
  transport: http(RPC_URL),
});

// Just enough ABI to read an ERC-20 balance.
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Unix seconds — matches the clock the engine/state use. */
function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

// The frontend lives on another origin (Vercel), so every response is CORS-open.
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

/** JSON response with CORS. bigint fields (SDK amounts) serialise as strings. */
function json(data: unknown, status = 200): Response {
  const body = JSON.stringify(
    data,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
  );
  return new Response(body, {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

/**
 * Validate an untrusted `POST /ride` body into a RideConfig. Returns either the
 * clean config or a human-readable error. Crucially, it REQUIRES at least one
 * guardrail: riding without a seatbelt is the one thing this product won't do.
 */
function validateConfig(
  body: any,
): { config: RideConfig } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "body must be a JSON object" };
  }

  const { asset, direction } = body;
  if (asset !== "BTC" && asset !== "ETH") {
    return { error: "asset must be 'BTC' or 'ETH'" };
  }
  if (direction !== "UP" && direction !== "DOWN") {
    return { error: "direction must be 'UP' or 'DOWN'" };
  }

  const startStake = Number(body.startStake);
  if (!Number.isFinite(startStake) || startStake <= 0) {
    return { error: "startStake must be a positive number" };
  }

  const intervalSec = Number(body.intervalSec);
  if (intervalSec !== 900 && intervalSec !== 3600) {
    return { error: "intervalSec must be 900 or 3600" };
  }

  const operatorId = body.operatorId === undefined
    ? OPERATOR_ID
    : Number(body.operatorId);
  if (!Number.isInteger(operatorId) || operatorId < 0) {
    return { error: "operatorId must be a non-negative integer" };
  }

  const g = body.guardrails;
  if (!g || typeof g !== "object") {
    return { error: "guardrails object is required" };
  }
  const guardrails: Guardrails = {};
  if (g.cashOutTarget !== undefined) {
    const v = Number(g.cashOutTarget);
    if (!Number.isFinite(v) || v <= 0) {
      return { error: "guardrails.cashOutTarget must be a positive number" };
    }
    guardrails.cashOutTarget = v;
  }
  if (g.stopLoss !== undefined) {
    const v = Number(g.stopLoss);
    if (!Number.isFinite(v) || v < 0) {
      return { error: "guardrails.stopLoss must be a non-negative number" };
    }
    guardrails.stopLoss = v;
  }
  if (g.maxRounds !== undefined) {
    const v = Number(g.maxRounds);
    if (!Number.isInteger(v) || v <= 0) {
      return { error: "guardrails.maxRounds must be a positive integer" };
    }
    guardrails.maxRounds = v;
  }
  if (
    guardrails.cashOutTarget === undefined &&
    guardrails.stopLoss === undefined &&
    guardrails.maxRounds === undefined
  ) {
    return {
      error:
        "set at least one guardrail (cashOutTarget, stopLoss, or maxRounds) — riding without a seatbelt is not allowed",
    };
  }

  const config: RideConfig = {
    asset,
    direction,
    startStake,
    intervalSec: intervalSec as IntervalSec,
    operatorId,
    guardrails,
  };

  // Optional builder-fee routing (our monetization) — accept only a clean pair.
  if (typeof body.builder === "string" && body.builder.startsWith("0x")) {
    config.builder = body.builder as `0x${string}`;
    if (body.builderFeeBpsTimes1k !== undefined) {
      config.builderFeeBpsTimes1k = BigInt(body.builderFeeBpsTimes1k);
    }
  }

  return { config };
}

/** Ride-wallet address + balances. Address is public; the key never leaves env. */
async function walletInfo(): Promise<Response> {
  const address = rideAddress();
  const collateral = ADDRESSES.collateral;
  let tUsdc = "0";
  let stt = "0";
  try {
    if (collateral) {
      const raw = await pub.readContract({
        address: collateral,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      tUsdc = formatUnits(raw as bigint, 6);
    }
    const native = await pub.getBalance({ address });
    stt = formatEther(native);
  } catch (err) {
    console.error("wallet balance read failed:", err);
  }
  return json({ address, tUsdc, stt });
}

/** Mint testnet tUSDC to the ride wallet (testnet faucet — free money for demos). */
async function mintFaucet(): Promise<Response> {
  const exchange = connect();
  try {
    attachRideWallet(exchange, ridePrivateKey());
    const tx = await exchange.trader.faucet();
    return json({ ok: true, tx });
  } finally {
    exchange.close();
  }
}

/** Start a ride: validate, enforce single-active (shared wallet), kick beat one. */
async function startRide(req: Request, kv: Deno.Kv): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "body must be valid JSON" }, 400);
  }

  const parsed = validateConfig(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400);

  // All rides share the one capped wallet, so only one may be active at a time —
  // two concurrent rides would fight over the same bankroll.
  const active = (await listRides(kv)).find((r) => isActive(r.state));
  if (active) {
    return json({ error: "a ride is already active", id: active.id }, 409);
  }

  const id = crypto.randomUUID();
  const state: RideState = initialRideState(parsed.config);
  await putRide(kv, id, state);

  // Kick the first beat immediately so the UI sees PLACING right away instead of
  // waiting up to two minutes for the cron. A kick failure never sinks the
  // create — the cron will pick the ride up on its next pass.
  let kicked = state;
  try {
    const after = await tickRide(kv, id);
    if (after) kicked = after;
  } catch (err) {
    console.error(`first-beat kick for ${id} failed:`, err);
  }

  return json({ id, state: kicked }, 201);
}

/** Ask a ride to stop — banks the current window, then halts (USER_STOP). */
async function stopRide(kv: Deno.Kv, id: string): Promise<Response> {
  const state = await getRide(kv, id);
  if (!state) return json({ error: "ride not found" }, 404);
  state.stopRequested = true;
  state.updatedAt = nowSec();
  await putRide(kv, id, state);
  return json({ id, state });
}

/** The one entry point Deno.serve calls. Routes method + path to a handler. */
export async function handle(req: Request, kv: Deno.Kv): Promise<Response> {
  const { pathname } = new URL(req.url);
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (method === "GET" && pathname === "/") {
      return json({
        service: "let-it-ride runner",
        endpoints: [
          "GET /health",
          "GET /wallet",
          "POST /faucet",
          "POST /ride",
          "GET /rides",
          "GET /ride/:id",
          "POST /ride/:id/stop",
        ],
      });
    }
    if (method === "GET" && pathname === "/health") {
      return json({ ok: true, ts: nowSec() });
    }
    if (method === "GET" && pathname === "/wallet") {
      return await walletInfo();
    }
    if (method === "POST" && pathname === "/faucet") {
      return await mintFaucet();
    }
    if (method === "POST" && pathname === "/ride") {
      return await startRide(req, kv);
    }
    if (method === "GET" && pathname === "/rides") {
      return json({ rides: await listRides(kv) });
    }

    const one = pathname.match(/^\/ride\/([^/]+)$/);
    if (one && method === "GET") {
      const id = one[1];
      const state = await getRide(kv, id);
      if (!state) return json({ error: "ride not found" }, 404);
      return json({ id, state });
    }

    const stop = pathname.match(/^\/ride\/([^/]+)\/stop$/);
    if (stop && method === "POST") {
      return await stopRide(kv, stop[1]);
    }

    return json({ error: "not found" }, 404);
  } catch (err) {
    console.error("handler error:", err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
}
