# Let It Ride — PROGRESS

*The living source of truth for this build. Updated as we go. Plain language on purpose.*

**Last updated:** 2026-08-22 (session 2 — first code written)

> **Recovery note (read me first after a crash):** the API key crashes sometimes. This file + the memory files are the source of truth. To get back up to speed cheaply: read this file top-to-bottom, then check `git log` / the file list — do NOT re-read the big research `.md`s or the `_reference/` source unless something here points you there.

---

## What we're building (one line)

**Let It Ride** — pick a direction (BTC/ETH, Up or Down), stake once, and if you win, your money automatically "rides" into the next round — same direction — until you hit your cash-out target, your stop-loss, or your round limit. Set it and watch it run.

*(An "Event Contract" = a bet on whether BTC or ETH is Up or Down at the end of a fixed time window, 15 min or 1 hr. It settles by itself on the blockchain — nobody presses a button. Winner takes the pot; loser loses only their stake. No fees, no leverage.)*

Hackathon: **Somnia × DreamDEX Event Contracts.** Submit **Aug 25 – Sep 8, 2026.** Judging: Technical 25% · UX 20% · Business 20% · Innovation 20% · Presentation 15%.

---

## Where we are right now

**Phase: 1. Foundation PROVEN on live testnet (smoke test passed). Setting up GitHub.**

- [x] Research done (saved — do NOT re-research)
- [x] Idea chosen: **Let It Ride**
- [x] Build plan approved → `let-it-ride-build-plan.md`
- [x] Architecture decided (below)
- [x] **Real EC API read directly from the cloned bot-kit source** (`_reference/`) — see cheat-sheet below
- [x] **Project skeleton created:** `package.json` (ESM), `.gitignore`, `scripts/smoke.mjs`
- [x] **SMOKE TEST PASSED** ✅ (Aug 22) — testnet live, SDK v0.28.1 connects, 10 live BTC/ETH markets read + one on-chain snapshot. Findings below.
- [ ] **← NEXT: push to GitHub** (repo + move the smoke test into a GitHub Actions workflow so it runs in the cloud, not on the PC).
- [ ] Vendor the `ec-core` helpers into our repo (it's MIT-licensed and NOT on npm)
- [ ] Build the core loop: place → watch settle → claim → decide → roll
- [ ] Frontend (Vite + React)
- [ ] Always-on runner (Cloudflare Worker cron)
- [ ] Demo video + README + SDK feedback report

---

## Smoke test — PASSED ✅ (Aug 22, session 2)

Ran `npm run smoke` once locally (before the "no local runs" rule landed); it gave us everything, so no need to re-run. What the LIVE network told us:

- **It works end-to-end:** testnet reachable, `@somnia-chain/markets-sdk@0.28.1` connects, `loadMarkets(true)` returns **557 markets / 548 binary / 10 live Up/Down**, and `getMarketOnchain(marketId)` returns a full snapshot (status=Trading, expiry, pool, yesId/noId, collateral tUSDC 6dp).
- **⚠ TWO venues live at once** — engine MUST scope to one:
  - `0x1a1e6821…5a050f` **operatorId 4** → the **300s (5-min)** markets.
  - `0x679795a0…35e8a28c` **operatorId 2** → 900s / 3600s / 14400s / 86400s markets.
  - `activeMarkets()` throws if live markets span >1 venue with no VENUE_ID set → we'll pin one. For a snappy demo, **5-min (op 4) is attractive**; 15-min (op 2) is the classic EC window.
- **Window sizes actually live:** 300s, 900s, 3600s, 14400s, 86400s. (Docs said only 15m/1h.)
- **Symbol format:** `ETH-242831-22AUG26-1245/tUSDC` = `<ASSET>-<n>-<DDMMMYY>-<HHMM>/tUSDC`. The 5-min markets carry a big number (strike?); others show `-0-`. Not blocking.
- **`expiry` is UNIX seconds** (1787402700 = 2026-08-22T12:45:00Z). Confirmed unit.
- **GOTCHA found:** `winningOutcome` returns `0` even when `isResolved=false`. → Only read `winningOutcome` after `isResolved===true`, else you'd think YES won every unsettled market.
- **Still open:** YES/NO → Up/Down mapping. Outcome symbols are just `…#YES` / `…#NO`; need a settled market or the app UI to confirm which side = "price up". Check when we place the first real bet.

---

## Locked decisions

1. **Idea:** Let It Ride (auto-roll a winning position across recurring Up/Down windows, with guardrails).
2. **Hosting = free only, and NOTHING runs on the user's PC.** GitHub + Vercel (frontend) + Cloudflare Workers (the 24/7 loop). **The PC has no compute headroom → do NOT run dev servers, builds, or the loop locally (updated Aug 22, session 2, at user's instruction).** Workflow = **push to GitHub; verify in the cloud** (GitHub Actions for scripts/tests, Vercel preview for the UI, Cloudflare for the Worker). Lightweight git/`gh` commands are fine — that's how we push. (The one local `node` smoke test already ran before this rule and won't be repeated.)
3. **Architecture = frontend + always-on worker.**
   - **Frontend** on Vercel: set-up screen, live ride view, start/stop.
   - **Always-on loop** = a **Cloudflare Worker cron** (free plan includes cron down to every minute) that does watch → claim → apply-rules → place-next roughly every 15 min, so the ride survives the user closing their tab/laptop. (Vercel free cron is once-per-day only — too slow — so it hosts the UI, not the loop.)
   - **Engine = portable TypeScript.** Prove it in Node first, then run the *same* logic in the Worker.
4. **Custody model = a small, capped "ride wallet."** A burner key the user funds with a little tUSDC + STT. Bounded, revocable, stop/withdraw anytime. The user's MAIN wallet is never exposed. Honest framing — we do NOT claim fully trustless. (Upgrade path: native delegation or an on-chain reactive contract, if DreamDEX confirms support.)
5. **No AI feature.** Deliberate — the value is the disciplined auto-roll mechanic, not another "AI reads the news" bot (that space is saturated).

---

## Confirmed vs. unconfirmed (technical reality)

### Confirmed (proven in the real EC source code)
- **Order placement works** from a normal TS/JS signer: `exchange.trader.placeOrder({...})`, wrapped safely by ec-core's `placeLimit`.
- **Settlement detection = polling** the authoritative on-chain status every ~15s (`getMarketOnchain`). Chain is the source of truth; the indexer lags by seconds.
- **Winnings must be explicitly claimed** — they do NOT auto-return to the wallet. Use `redeemHoldings` / `claimSettled`.
- **Testnet:** chainId **50312**, RPC `https://api.infra.testnet.somnia.network`, collateral **tUSDC (6 decimals)** at `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` — and it has a **public `faucet(uint256)`** so we can self-fund test money. STT gas via docs.somnia.network/developer/network-info.
- **State machine must be WIN / LOSS / VOID / UNSETTLED** — a voided market refunds both sides 0.5, it is not a loss.

### NEW finding (Aug 22) — builder fee likely DOES exist for EC 🎯
Round-1 research said "builder fee unconfirmed for EC." But reading the real source, the binary pool's on-chain params include **`maxBuilderFeeBpsTimes1k`** (in `getBinaryPoolParams`, see `settlement.ts`). That means the EC pool contract *has* a builder-fee concept — the bot-kit's `placeLimit` just doesn't pass it. **To confirm:** check whether the SDK's `exchange.trader.placeOrder(...)` accepts a `builder` / `builderFeeBpsTimes1k` field (we'll grep the installed SDK types — free, no research round needed).

### Still unconfirmed
- **Non-custodial session keys for EC.** The delegation machinery (`OperatorPermissionsRegistry` / `placeOrderFor`) is proven for *spot*, not EC. The EC address type even has an `operatorPermissionsRegistry` slot — but it's empty in the bundled deployment. Our capped "ride wallet" sidesteps this for the MVP.
- **On-chain reactive re-arm (no server).** Somnia Reactivity can run Solidity on events, but no full EC place→settle→re-arm example exists. Good demo stretch, not an MVP dependency.

---

## Gotchas already baked into our plan (from the real source)
1. **Key state by `marketId` / symbol, never pool address** — pools get recycled across windows.
2. **A reverted transaction may NOT throw** — always call `assertTxOk(res)` on the receipt.
3. **Never hand a float price to the SDK** on an 18-dec venue (`0.05` → off-grid reject). Use ec-core's `placeLimit`, which converts in integer tick/lot units. (Testnet is 6-dec and forgiving, mainnet is not.)
4. **Orders need an expiry**, capped at the market's expiry — doubles as a dead-man's switch.
5. **No naked short** — to sell a side you must first mint a complete pair (`seedInventory`). For Let It Ride we mostly BUY a direction, so this matters less.
6. **Settled markets leave the live list** — find winnings via `settledMarkets()` (`listBinaryMarkets({status:"Finalized"})`), not `loadMarkets()`.
7. **Gate on `status === Trading (1)`** — only Trading accepts orders.
8. **Verify funds before ordering** to avoid burning gas on reverts (ec-core's `placeLimit` already does `assertFunded`).

---

## EC API cheat-sheet (so we don't re-read the source)

`@somnia-chain/markets-sdk` is the base SDK (on npm, v0.28.0). `@dreamdex-bot-kit/ec-core` is a thin MIT wrapper over it — **NOT on npm**, so we vendor it.

```
// Connect
const exchange = new SomniaMarkets({ indexerUrl, chain, wsRpcUrl, addresses, priceFeed, privateKey? })

// Live markets (binary = event contracts)
Object.values(await exchange.loadMarkets(true)).filter(m => m.type === "binary" && m.active)

// Authoritative snapshot — resolve by marketId (Hex), reuse it for a whole pass
const oc = await exchange.client.getMarketOnchain(marketId)
//   → { status, isResolved, isVoided, winningOutcome, pool, outcomeToken,
//       yesId, noId, expiry, collateral, decimals, marketAddress, finalized }
// status: 0 Listed 1 Trading 2 Locked 3 Settling 4 Resolved 5 Voided  (only 1 accepts orders)

// Place (vendored helper — handles tick/lot, expiry, funding, assertTxOk)
placeLimit(ctx, { market, onchain, outcome:"YES"|"NO", side:"buy"|"sell",
                  price /*0..1*/, size /*shares*/, type:"ioc", expiresInSec })

// Watch settlement: poll getMarketOnchain every ~15s until isResolved || isVoided
// Claim winnings (they do NOT auto-arrive):
redeemHoldings(ctx, market, onchain)      // one market
claimSettled(ctx, { scan })               // sweep recently settled
settledMarkets(ctx, limit)                // find finalized markets holding winnings

// Balances
exchange.client.getOutcomeBalance({ outcomeToken, account, id })
exchange.client.getErc20Balance(collateral, address)

// ALWAYS on writes: assertTxOk(res, label)
```

**Direction mapping to verify on live data:** YES = outcome 0, NO = outcome 1. Need to confirm which one = "price Up" for a given market (from the market symbol/outcome symbols). To check in the smoke test.

---

## Testnet config (LOCKED — copied from ec-core source, no need to re-read)

```
chainId  50312
RPC      https://api.infra.testnet.somnia.network
WS       wss://api.infra.testnet.somnia.network/ws
indexer  https://dev.smk.somnia.host/v1/graphql   (⚠ this URL has moved before — if loadMarkets fails, this is the first suspect)
decimals 6   (tUSDC; mainnet USDso = 18)

Addresses (CORE is CREATE3, identical on mainnet):
  binaryModule          0x3ecC694Cef705358864a646142ac17A90E29e388
  marketsCore           0x2802504314685D89bF6C992CA5a8e7cC78bc0294
  clobFactory           0xb2BE8EE02F96379DB75f01802384593EBa9bfF04
  binaryPoolImpl        0x82A1FcdaA2daC2fC7D5f9909D43E68021eE966FD
  binarySettlement      0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23
  collateralRouter      0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C
  marketCreatorFactory  0xE6bEE93cE87c9E6e62aCb621caa7832EE47b4F6B
  oracleHub             0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b
  collateral / testUsdc 0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E   (public faucet(uint256), 6dp)
  marketCreator         0x5Ce69567dB39C8fBAd7e048bEfdbcCdfE67B44e6   (testnet, venue-2 creator)

Mainnet (for later): chainId 5031, collateral USDso 0x00000022dA000002656c64D9eA6011ea952D008A (18dp).
Book granularity testnet: tick 1000 / lot 1 raw units (mainnet 1e15 / 1e15). Binary rows carry NO tickSize/lotSize → from config.
priceFeed: SOMNIA_TESTNET_PRICE_FEED (bundled export from @somnia-chain/markets-sdk). Only needed for BTC/ETH spot; not for listing/status.
```

Connect + list (verified from `ec-core/exchange.ts` + `markets.ts`):
```js
const exchange = new SomniaMarkets({ indexerUrl, chain, wsRpcUrl, addresses, priceFeed });
const live = Object.values(await exchange.loadMarkets(true)).filter(m => m.type === "binary" && m.active);
const oc = await exchange.client.getMarketOnchain(m.info.marketId);  // authoritative snapshot
// market fields: m.symbol, m.info.{marketId,asset,intervalSec,venueId,operatorId}, m.outcomes[0/1].symbol (YES/NO)
```

---

## The core loop (what the engine does)

```
User sets: asset + direction + stake + cash-out target + stop-loss + max rounds
  → find current Trading market for that asset/direction
  → place the bet (buy the chosen side)
  → poll on-chain status ~15s until Resolved or Voided
  → claim/redeem the settled position
  → WIN?  → apply rules → find NEXT Trading window → place again (roll)
     LOSS? → stop, show summary
     VOID? → neutral stop / refund, decide per rules
  → repeat until a stop rule fires (target / stop-loss / max rounds / user hits Stop)
  → show shareable run summary
```

---

## Files in this project

| File | What it is |
|---|---|
| `PROGRESS.md` | **This file** — living status. |
| `let-it-ride-build-plan.md` | The approved product plan (pitch, screens, timeline). |
| `let-it-ride-sdk-verification-research.md` | Round-1 ChatGPT research (deep, 35KB). |
| `hackathon-research-brief.md` | Original research brief. |
| `sdk-verification-brief.md` / `sdk-deep-dive-brief.md` | Research briefs for ChatGPT (round 1 & 2). |
| `_reference/dreamdex-bot-kit/` | Cloned bot-kit — the REAL EC source we read + will vendor from. Read-only reference. |

---

## Immediate next steps
1. **Smoke test (no money):** minimal Node script → connect to testnet → list live BTC/ETH binary markets + print one on-chain snapshot. Proves testnet is live and the SDK works. While the SDK is installed, grep its types for `builder` / `placeOrderFor` / `operator` / `subscribe` to answer the open questions for free.
2. Vendor `ec-core` into `src/ec/` (rewire `config.ts` off `dotenv`/`node:fs` so it runs in browser + Worker too).
3. Write the portable roll engine (place → watch → claim → decide → roll) and prove one full cycle on testnet with a funded ride wallet.
4. Frontend shell → wire the engine → live ride screen.
5. Move the loop into a Cloudflare Worker cron.
