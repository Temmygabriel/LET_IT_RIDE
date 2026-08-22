// Portable connection config for Let It Ride.
//
// Safe to import from Node, a browser tab, or a Cloudflare Worker: no dotenv,
// no node:fs, no process.env — everything here is a plain constant or a pure
// factory. Values are copied verbatim from the read-only smoke test that CI
// already runs green (scripts/smoke.mjs), so the engine connects the exact
// same way the proven test does.

import { defineChain } from "viem";
import { SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import type {
  SomniaMarketsAddresses,
  SomniaMarketsConfig,
} from "@somnia-chain/markets-sdk";

// --- Testnet endpoints ---
export const CHAIN_ID = 50312;
export const RPC_URL = "https://api.infra.testnet.somnia.network";
export const WS_URL = "wss://api.infra.testnet.somnia.network/ws";
export const INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";

// --- Deployed contract addresses (testnet) ---
// CORE contracts are CREATE3-deterministic; collateral (tUSDC, 6 decimals, with
// a public faucet) and marketCreator are the testnet-specific ones. This is the
// venue-2 deployment where the live 15m / 1h BTC-ETH windows sit.
export const ADDRESSES: SomniaMarketsAddresses = {
  binaryModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
  marketsCore: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294",
  clobFactory: "0xb2BE8EE02F96379DB75f01802384593EBa9bfF04",
  binaryPoolImpl: "0x82A1FcdaA2daC2fC7D5f9909D43E68021eE966FD",
  binarySettlement: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23",
  collateralRouter: "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C",
  marketCreatorFactory: "0xE6bEE93cE87c9E6e62aCb621caa7832EE47b4F6B",
  oracleHub: "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b",
  // testnet tUSDC — public faucet(uint256), 6 decimals
  collateral: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  testUsdc: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  // venue-2 creator (where the live markets are hosted)
  marketCreator: "0x5Ce69567dB39C8fBAd7e048bEfdbcCdfE67B44e6",
};

// The venue/operator that hosts Let It Ride's windows. Two venues run at once on
// testnet (operatorId 4 = 300s markets, operatorId 2 = 900s/3600s/… ), so the
// engine MUST scope to one or market lookups become ambiguous.
export const OPERATOR_ID = 2;

// viem chain definition the SDK needs to talk to Somnia testnet.
export const somniaTestnet = defineChain({
  id: CHAIN_ID,
  name: `somnia-${CHAIN_ID}`,
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL], webSocket: [WS_URL] } },
});

// Read-only base config (no signer attached). The engine boots read-only, then
// attaches the capped ride wallet later via exchange.setSigner({ privateKey }).
// See src/exchange.ts.
export function baseConfig(): SomniaMarketsConfig {
  return {
    indexerUrl: INDEXER_URL,
    chain: somniaTestnet,
    wsRpcUrl: WS_URL,
    addresses: ADDRESSES,
    priceFeed: SOMNIA_TESTNET_PRICE_FEED,
  };
}
