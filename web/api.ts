// The one place the browser talks to the runner. The runner owns the wallet and
// the loop; we just POST a config and poll state. Base URL comes from
// VITE_RUNNER_URL (the deployed Deno Deploy runner) — see .env.example.

import type { Asset, Direction, IntervalSec, Guardrails, RideState } from "../src/types.ts";

/** The runner's base URL, trailing slash trimmed. Empty = same origin (dev). */
export const RUNNER_URL = (import.meta.env.VITE_RUNNER_URL ?? "").replace(/\/+$/, "");

/** True once a real runner URL is configured; the UI warns when it isn't. */
export const RUNNER_CONFIGURED = RUNNER_URL.length > 0;

/** The config the browser sends to start a ride (no builder-fee fields in MVP). */
export interface StartRideBody {
  asset: Asset;
  direction: Direction;
  startStake: number;
  intervalSec: IntervalSec;
  guardrails: Guardrails;
}

export interface WalletInfo {
  address: string;
  tUsdc: string;
  stt: string;
}

export interface RideEnvelope {
  id: string;
  state: RideState;
}

export interface RidesList {
  rides: RideEnvelope[];
}

/** Small typed fetch wrapper: JSON in, JSON out, errors surfaced as thrown Error. */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${RUNNER_URL}${path}`, {
      headers: { "content-type": "application/json" },
      ...init,
    });
  } catch {
    throw new Error(
      RUNNER_CONFIGURED
        ? "Can't reach the runner. Is it deployed and awake?"
        : "No runner configured yet — set VITE_RUNNER_URL.",
    );
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const getWallet = (): Promise<WalletInfo> => req<WalletInfo>("/wallet");

export const mintFaucet = (): Promise<{ ok: boolean }> =>
  req<{ ok: boolean }>("/faucet", { method: "POST" });

export const startRide = (body: StartRideBody): Promise<RideEnvelope> =>
  req<RideEnvelope>("/ride", { method: "POST", body: JSON.stringify(body) });

export const getRide = (id: string): Promise<RideEnvelope> =>
  req<RideEnvelope>(`/ride/${encodeURIComponent(id)}`);

export const listRides = (): Promise<RidesList> => req<RidesList>("/rides");

export const stopRide = (id: string): Promise<RideEnvelope> =>
  req<RideEnvelope>(`/ride/${encodeURIComponent(id)}/stop`, { method: "POST" });
