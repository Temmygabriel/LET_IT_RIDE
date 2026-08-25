// The capped ride wallet's key + address, sourced from the runner's environment.
//
// The private key lives ONLY as the Deno Deploy env var RIDE_WALLET_PK — never
// in code, never in the repo, never in a response body. The ADDRESS is public
// and safe to show (the UI needs it so the user can fund it).

import { privateKeyToAccount } from "viem/accounts";

/** Read + normalise the ride wallet private key from the environment. */
export function ridePrivateKey(): `0x${string}` {
  const raw = Deno.env.get("RIDE_WALLET_PK");
  if (!raw) {
    throw new Error("RIDE_WALLET_PK is not set in the runner environment");
  }
  const pk = raw.startsWith("0x") ? raw : `0x${raw}`;
  return pk as `0x${string}`;
}

/** The ride wallet's public address, derived from the key — no network needed. */
export function rideAddress(): `0x${string}` {
  return privateKeyToAccount(ridePrivateKey()).address;
}
