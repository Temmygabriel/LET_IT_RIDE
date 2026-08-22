// Let It Ride — SMOKE TEST (read-only, no money).
//
// Proves the whole foundation in one shot:
//   1. the Somnia testnet is live and reachable,
//   2. the markets SDK connects,
//   3. we can list the live BTC/ETH binary (Up/Down) markets, and
//   4. we can read ONE authoritative on-chain snapshot (the source of truth
//      the roll engine will act on).
//
// It also prints the live venue id(s) + the YES/NO outcome symbols, which we
// need for later steps. No private key is loaded, so nothing can spend money.
//
// Run:  npm run smoke
//
// Config values below are copied verbatim from the real bot-kit source we
// cloned into _reference/ (packages/ec-core/src/config.ts + addresses.ts).

import { SomniaMarkets, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { defineChain } from "viem";

// --- Testnet endpoints (ec-core/config.ts → ENDPOINTS.testnet) ---
const CHAIN_ID = 50312;
const RPC = "https://api.infra.testnet.somnia.network";
const WS = "wss://api.infra.testnet.somnia.network/ws";
const INDEXER = "https://dev.smk.somnia.host/v1/graphql";

// --- Deployed contract addresses (ec-core/addresses.ts → DEPLOYMENTS.testnet) ---
// CORE is CREATE3-deterministic (identical on both networks); collateral +
// marketCreator are the testnet-specific ones.
const ADDRESSES = {
  binaryModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
  marketsCore: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294",
  clobFactory: "0xb2BE8EE02F96379DB75f01802384593EBa9bfF04",
  binaryPoolImpl: "0x82A1FcdaA2daC2fC7D5f9909D43E68021eE966FD",
  binarySettlement: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23",
  collateralRouter: "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C",
  marketCreatorFactory: "0xE6bEE93cE87c9E6e62aCb621caa7832EE47b4F6B",
  oracleHub: "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b",
  // testnet tUSDC (public faucet(uint256), 6 decimals)
  collateral: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  testUsdc: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  // venue-2 creator (where the live markets sit)
  marketCreator: "0x5Ce69567dB39C8fBAd7e048bEfdbcCdfE67B44e6",
};

const chain = defineChain({
  id: CHAIN_ID,
  name: `somnia-${CHAIN_ID}`,
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC], webSocket: [WS] } },
});

// On-chain MarketStatus enum (ec-core/markets.ts). Only "Trading" accepts orders.
const STATUS = ["Listed", "Trading", "Locked", "Settling", "Resolved", "Voided"];

async function main() {
  console.log(`→ Connecting to Somnia testnet (chainId ${CHAIN_ID})…`);
  const exchange = new SomniaMarkets({
    indexerUrl: INDEXER,
    chain,
    wsRpcUrl: WS,
    addresses: ADDRESSES,
    priceFeed: SOMNIA_TESTNET_PRICE_FEED,
    // no privateKey → read-only, cannot spend anything
  });

  try {
    console.log("→ Loading markets from the indexer…");
    const all = Object.values(await exchange.loadMarkets(true));
    const binary = all.filter((m) => m.type === "binary");
    const live = binary.filter((m) => m.active);

    console.log(
      `✓ Indexer OK. ${all.length} total markets · ${binary.length} binary · ${live.length} live binary (Up/Down).`,
    );

    if (live.length === 0) {
      console.log("⚠ No live binary markets at this moment (windows rotate — retry in a bit).");
    }

    for (const m of live.slice(0, 12)) {
      const info = m.info ?? {};
      const outs = m.outcomes ?? [];
      console.log(
        `  • ${m.symbol}  asset=${info.asset ?? "?"} interval=${info.intervalSec ?? "?"}s  ` +
          `venue=${info.venueId ?? "?"} op=${info.operatorId ?? "?"}  ` +
          `YES=${outs[0]?.symbol ?? "?"} NO=${outs[1]?.symbol ?? "?"}  id=${info.marketId ?? "?"}`,
      );
    }

    // Distinct venue id(s) among live markets — we need VENUE_ID for scoping later.
    const venues = [
      ...new Set(live.map((m) => String(m.info?.venueId ?? "").toLowerCase()).filter(Boolean)),
    ];
    if (venues.length) console.log(`→ Live venue id(s): ${venues.join(", ")}`);

    // Read ONE authoritative on-chain snapshot — the generation the engine acts on.
    const first = live[0];
    if (first) {
      console.log(`→ Reading on-chain snapshot for ${first.symbol}…`);
      const oc = await exchange.client.getMarketOnchain(first.info.marketId);
      const exp = oc.expiry ? Number(oc.expiry) : 0;
      console.log("✓ On-chain snapshot:");
      console.log(`    status         : ${STATUS[oc.status] ?? oc.status} (${oc.status})`);
      console.log(`    isResolved     : ${oc.isResolved}`);
      console.log(`    isVoided       : ${oc.isVoided}`);
      console.log(`    winningOutcome : ${oc.winningOutcome}`);
      console.log(`    expiry         : ${String(oc.expiry)}${exp ? ` (${new Date(exp * 1000).toISOString()})` : ""}`);
      console.log(`    yesId / noId   : ${String(oc.yesId)} / ${String(oc.noId)}`);
      console.log(`    pool           : ${oc.pool}`);
      console.log(`    collateral     : ${oc.collateral} (decimals ${oc.decimals})`);
    }

    console.log("\n✅ SMOKE TEST PASSED — testnet live, SDK connects, markets readable.");
  } finally {
    // The live-tail socket can keep the event loop alive; cap the wait and move on.
    await Promise.race([
      Promise.resolve(exchange.close?.()).catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ SMOKE TEST FAILED:", e?.message ?? e);
    if (e?.stack) console.error(e.stack);
    process.exit(1);
  });
