// Connection layer: boot the SDK read-only, then attach or detach the ride
// wallet. Kept deliberately thin so both the browser and the Worker use the
// exact same connect/attach code path.

import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { baseConfig } from "./config.ts";

/** Boot a read-only exchange. Cannot spend anything until a signer is attached. */
export function connect(): SomniaMarkets {
  return new SomniaMarkets(baseConfig());
}

/**
 * Attach the capped ride wallet so the engine can place orders and claim.
 * The private key is the ride wallet's ONLY — never the user's main wallet.
 */
export function attachRideWallet(
  exchange: SomniaMarkets,
  privateKey: `0x${string}`,
): void {
  exchange.setSigner({ privateKey });
}

/** Drop the signer and return to read-only (e.g. after a ride stops). */
export function detachSigner(exchange: SomniaMarkets): void {
  exchange.setSigner({});
}

/** The ride wallet's address once attached, or undefined while read-only. */
export function walletAddress(exchange: SomniaMarkets): `0x${string}` | undefined {
  return exchange.walletAddress;
}
