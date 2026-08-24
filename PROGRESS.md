# Let It Ride — PROGRESS

*The living source of truth for this build. Updated as we go. Plain language on purpose.*

**Last updated:** 2026-08-24 (session 3 — roll engine authored + SDK-verified, pushed for CI)

**Repo:** https://github.com/Temmygabriel/LET_IT_RIDE — remote `origin`, branch `main`. Push works via **Git Credential Manager** (creds already stored; no `gh` CLI needed). CI runs the smoke test on every push → watch the **Actions** tab.

> **Recovery note (read me first after a crash):** the API key crashes sometimes. This file + the memory files are the source of truth. To get back up to speed cheaply: read this file top-to-bottom, then check `git log` / the file list — do NOT re-read the big research `.md`s or the `_reference/` source unless something here points you there.

---

## What we're building (one line)

**Let It Ride** — pick a direction (BTC/ETH, Up or Down), stake once, and if you win, your money automatically "rides" into the next round — same direction — until you hit your cash-out target, your stop-loss, or your round limit. Set it and watch it run.

*(An "Event Contract" = a bet on whether BTC or ETH is Up or Down at the end of a fixed time window, 15 min or 1 hr. It settles by itself on the blockchain — nobody presses a button. Winner takes the pot; loser loses only their stake. No fees, no leverage.)*

Hackathon: **Somnia × DreamDEX Event Contracts.** Submit **Aug 25 – Sep 8, 2026.** Judging: Technical 25% · UX 20% · Business 20% · Innovation 20% · Presentation 15%.

---

## Where we are right now

**Phase: 1 → 2. Foundation is on GitHub + CI is wired. Next: vendor ec-core, then the roll loop.**

- [x] Research done (saved — do NOT re-research)
- [x] Idea chosen: **Let It Ride**
- [x] Build plan approved → `let-it-ride-build-plan.md`
- [x] Architecture decided (below)
- [x] **Real EC API read directly from the cloned bot-kit source** (`_reference/`) — see cheat-sheet below
- [x] **Project skeleton created:** `package.json` (ESM), `.gitignore`, `scripts/smoke.mjs`
- [x] **SMOKE TEST PASSED** ✅ (Aug 22) — testnet live, SDK v0.28.1 connects, 10 live BTC/ETH markets read + one on-chain snapshot. Findings below.
- [x] **Pushed to GitHub** ✅ → https://github.com/Temmygabriel/LET_IT_RIDE (commit `3256a8c`).
- [x] **Smoke test moved into CI** ✅ → `.github/workflows/smoke.yml` runs it on GitHub's machines on every push (this is our "verify without touching the PC" pipeline).
- [x] **Read the full base-SDK surface** (`index.d.ts` + `unified/exchange.d.ts` + `somniaMarketsClient.d.ts`) → **decided NOT to vendor `ec-core`** (see "PIVOT" below). The base SDK already has everything the wrapper did, in human units, browser/Worker-ready.
- [x] **Portable engine built directly on `@somnia-chain/markets-sdk`** in `src/` (TypeScript, type-checked in CI): config → connect/attach-wallet → find-market → place → watch-settle → claim → decide → roll. **`src/config.ts` · `types.ts` · `exchange.ts` · `rules.ts` · `engine.ts` — typecheck + smoke CI GREEN on `a2eb238`.**
- [ ] **← NEXT:** Frontend (Vite + React on Vercel)
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

### CONFIRMED from the SDK types (Aug 22, session 2) — read `trade.d.ts` + `native/session.d.ts` directly 🎯
> Tooling gotcha: the search tool (ripgrep) **skips `node_modules` because it's gitignored** → it reported "no matches" for `builder` when the feature was right there. Lesson: to inspect an installed dep, **Read the file directly** (Read bypasses ignore), don't grep. Baked this into memory.

**1. Builder fee (our revenue) — CONFIRMED available for EC.** The binary `placeOrder` params (`PlaceOrderParams`) DO include `builder?: Address` + `builderFeeBpsTimes1k?: bigint`, and the Trader has `approveBuilder`, `getMaxBuilderFeeBpsTimes1k(pool)`, `getEffectiveBuilderApproval`. So we CAN tag orders with our frontend address and earn a routing fee. **Design caveats:** (a) the ride wallet must call `approveBuilder(pool, ourBuilder, maxFee)` once **per pool** before a fee-bearing order — and EC pools recycle across markets, so re-approve on each new pool; (b) on a BinaryPool the fee ceiling is **frozen at init** (not owner-updatable) — if a venue set it to 0, we earn 0. **→ Read `getMaxBuilderFeeBpsTimes1k(pool)` on a live testnet pool before banking on revenue.**

**2. Non-custodial delegation for EC — still NO "place on my behalf", so ride-wallet stands (confirmed correct).** Operator / `placeOrderFor` delegation is **SPOT-only** (`setOperatorApprovalForPool` explicitly says "SpotPool"); the `Trader` interface has **no `placeOrderFor` for binary**. A third party can't place EC bets without a key. BUT two useful non-custodial pieces DO exist for EC: (a) **native session keys** — `sessionPrivateKey(seed)` / `sessionAddress(seed)` derive a burner from a 32-byte seed the user keeps (this basically *is* our ride wallet, formalized — fund `sessionAddress(seed)`); (b) **`signRedeemAuth` + `redeemFor`** — the owner signs once and a relayer CLAIMS winnings for them, gas-sponsored, payout hard-pinned to the owner. So claiming can be made non-custodial even though placing can't.

**3. Demo super-power — `resolve()` / `voidMarket()` via FakeOracle.** Trader exposes `resolve({market, outcomeIdx})` and `voidMarket({market})` against a **FakeOracle (demo/dev resolver)**. If the auto-generated venue markets accept it, we can force WIN/LOSS/VOID on demand → the demo video shows a full place→settle→roll cycle in seconds instead of waiting 5–15 min. (Verify it applies to venue markets; may only work on markets we create.)

**4. Authoritative settlement read = `trader.getSettlement(marketId)`** → `SettlementRecord { finalized, voided, winningOutcome (0=YES/1=NO, only when !voided), payoutNumerators, backing }`. Use THIS for the WIN/LOSS/VOID decision — not `getMarketOnchain().winningOutcome` (which reads 0 when unresolved). Confirms void ⇒ both sides redeem at half.

### Still unconfirmed / to verify on live pools
- **Is the builder-fee ceiling actually > 0 on the live venues?** `getMaxBuilderFeeBpsTimes1k(pool)` is frozen-at-init on BinaryPools → could be 0. Read it on a live 300s + 900s pool before promising revenue.
- **Does `resolve()`/`voidMarket()` (FakeOracle) work on the auto-generated venue markets**, or only on markets we create ourselves? Decides whether the demo can force a fast settlement.
- **YES/NO → Up/Down mapping** (open since the smoke test).
- **On-chain reactive re-arm (fully keyless, no server).** Somnia Reactivity can run Solidity on events, but no full EC place→settle→re-arm example exists. Good demo stretch, not an MVP dependency. *(Note: "non-custodial placing" is now settled — the SDK has NO `placeOrderFor` for binary, so holding a key is required; our ride wallet = a funded `sessionAddress(seed)` is the right model. Non-custodial CLAIM, however, is possible via `signRedeemAuth`+`redeemFor`.)*

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

### SDK write-API (the real layer under the wrapper — from `trade.d.ts`, Aug 22 s2)
```
// A signer/trader (provide ≥1 signing source; decimals default 6, gas default 10_000_000)
const trader = client.createTrader({ privateKey /* or walletClient / account */, publicClient })

// PLACE a binary bet. price + quantity are INTEGERS in raw units (NOT floats):
//   price    = probability × 10^decimals   → 0.62 becomes 620_000n   (collateral per 1 whole token)
//   quantity = tokens      × 10^decimals   → 10 tokens becomes 10_000_000n
await trader.placeOrder({
  pool,                       // the market's pool Address
  side: "BUY_YES",            // BinarySide: BUY_YES | SELL_YES | BUY_NO | SELL_NO
  price: 620_000n,
  quantity: 10_000_000n,
  orderType: 2,               // ORDER_TYPE: 0 LIMIT · 1 FILL_OR_KILL · 2 MARKET(IOC) · 3 POST_ONLY
  builder,                    // OUR frontend address → earns routing fee (optional)
  builderFeeBpsTimes1k,       // ≤ getMaxBuilderFeeBpsTimes1k(pool) AND ≤ our approval
  // expireTimestampNs defaults to the market expiry (dead-man switch); autoApprove defaults true
})

// BUILDER FEE (our revenue) — per-pool, do once before a fee-bearing order on a new pool:
await trader.approveBuilder({ pool, builder, maxFeeBpsTimes1k })
await trader.getMaxBuilderFeeBpsTimes1k(pool)   // BinaryPool ceiling — FROZEN at init; could be 0

// SETTLEMENT — the authoritative WIN/LOSS/VOID read:
const s = await trader.getSettlement(marketId)
//   → { finalized, voided, winningOutcome (0=YES/1=NO, only when !voided),
//       payoutNumerators, backing, ... }  |  null if not settled yet

// CLAIM winnings (they do NOT auto-arrive). outcomeIdx 0=YES 1=NO:
await trader.redeem({ marketId, amount, outcomeIdx })
await trader.redeemMany({ entries: [{ marketId, outcomeIdx, amount }] })
// Non-custodial claim: owner signs once → relayer submits, payout pinned to owner:
const auth = await trader.signRedeemAuth({ ... }); await relayer.redeemFor({ ...auth })

// Test money (no faucet UI needed): mints tUSDC to the trader
await trader.faucet({ /* amount? defaults 10_000 × 10^decimals */ })

// Ride wallet as a session key (import from "@somnia-chain/markets-sdk/native"):
//   sessionAddress(seed) → the address to FUND ;  sessionPrivateKey(seed) → the key to sign with

// DEMO fast-forward (FakeOracle, dev only — verify it works on venue markets):
await trader.resolve({ market, outcomeIdx })   // 0 = YES wins, 1 = NO wins
await trader.voidMarket({ market })
```

**Direction mapping to verify on live data:** YES = outcome 0, NO = outcome 1. Need to confirm which one = "price Up" for a given market (from the market symbol/outcome symbols). To check in the smoke test.

---

## PIVOT (Aug 22, s2): build on the base SDK's UNIFIED layer, do NOT vendor ec-core

After reading the full `@somnia-chain/markets-sdk@0.28.1` type surface, the plan to vendor `ec-core` is **dropped**. The base SDK's *unified* layer (`new SomniaMarkets(cfg)` → the `exchange` object) already provides, in **human units** and **browser/Worker-ready**, everything ec-core's wrapper gave us — plus purpose-built helpers that match Let It Ride almost 1:1. Less code, officially supported, nothing to port. The engine is a thin state machine over these calls.

```ts
import {
  SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED,
} from "@somnia-chain/markets-sdk";

// 1) CONNECT (read-only at boot — no key). Addresses are a baked-in constant now.
const exchange = new SomniaMarkets({
  chain, wsRpcUrl: WS, indexerUrl: INDEXER,
  addresses: SOMNIA_TESTNET_ADDRESSES, priceFeed: SOMNIA_TESTNET_PRICE_FEED,
});
await exchange.loadMarkets();
const client = exchange.client;               // raw bigint-exact read tier

// 2) ATTACH THE RIDE WALLET later (browser: on connect; Worker: from its secret).
exchange.setSigner({ privateKey });           // pass {} to go back to read-only
// exchange.trader  → raw write tier (throws if no signer)

// 3) FIND the market to bet/roll into — one call does asset+window+venue scoping,
//    returns live markets (expiry>now) soonest-first, so [0] = the current window.
const [mkt] = await client.listLiveBinaryMarkets({ asset: "BTC", intervalSec: 300, venueId });
//    (also: listBinaryVenueIds(), listBinaryAssets() to enumerate options)

// 4) SIZE a stake → order ("bet $50 on Up"). side BUY_YES = Up, BUY_NO = Down.
const q = await client.quoteBinaryStake({ marketId: mkt.marketId, side: "BUY_YES", stake: 50_000_000n /*$50×1e6*/ });
// q → { yesPrice, quantity, protectiveLimit, ... }  |  null if unfillable

// 5) PLACE. Two options:
//   (a) human-unit unified (auto tick/lot align, NO-price inversion, our fee):
await exchange.createOrder(`${mkt.symbol}#YES`, "market", "buy", shares, price,
  { builder: OUR_ADDRESS, builderFeeBpsTimes1k });
//   (b) raw, straight from the quote:
await exchange.trader.placeOrder({ pool: mkt.pool, side: "BUY_YES",
  price: q.yesPrice, quantity: q.quantity, orderType: 2 /*MARKET*/, builder, builderFeeBpsTimes1k });

// 6) WATCH settlement — poll the authoritative on-chain read until resolved/voided:
const oc = await client.getMarketOnchain(mkt.marketId);   // status/isResolved/isVoided/winningOutcome
// or trader.getSettlement(marketId) for the SettlementRecord (winningOutcome only meaningful when !voided)

// 7) CLAIM — one call returns ALL redeemable positions across settled markets,
//    winners net of fee, void = half each, losers excluded. Feeds redeemMany directly.
const claimable = await client.getClaimable(account);     // → [{ marketId, outcomeIdx, amount }, ...]
if (claimable.length) await exchange.trader.redeemMany({ entries: claimable });
//    (single-market human-unit alternative: exchange.redeem(`${sym}`, amount))

// 8) DECIDE win/loss/void from the settlement, apply guardrails, roll to the next window.
// Extras for the UI: client.getMarketResolution(marketId) → { openingAnswer, closingAnswer }
//   = "Up from $X → $Y"; client.getOpenPositionsWithPnL(account) / getBinaryPositionPnL for the ride summary;
//   exchange.fetchBalance() → balances keyed by currency AND by tradable symbol ("...#YES").
```

**Direction mapping (strong signal, still to hard-confirm):** the SDK exposes `upProbability` / `upPercent` / `markYesPrice` in `units.js`, all derived from the **YES** price → **YES = Up, NO = Down** by convention. Confirm once on a settled market via `getMarketResolution` (opening vs closing) before trusting it with money.

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
| `README.md` | Project front page — product, architecture, status, how to run the smoke test. |
| `PROGRESS.md` | **This file** — living, dated build log. |
| `package.json` / `package-lock.json` | Dependencies (`@somnia-chain/markets-sdk` + viem). |
| `scripts/smoke.mjs` | Read-only testnet smoke test (connect + list live BTC/ETH markets). |
| `.github/workflows/smoke.yml` | CI — runs the smoke test in the cloud on every push. |

_Internal planning and research notes are kept on disk but out of the public repo._

---

## Immediate next steps
1. Scaffold TypeScript + add a `tsc --noEmit` typecheck job to CI (we can't run locally, so CI is our compiler).
2. Write the portable roll engine **directly on `@somnia-chain/markets-sdk`** (the "vendor ec-core" plan was dropped — the SDK's unified layer already covers everything, in human units, browser/Worker-ready): `src/config.ts`, `src/exchange.ts` (connect + attach/detach the ride wallet), `src/engine.ts` (find → place → watch → claim → decide → roll, with guardrails). Prove one full cycle on testnet with a funded ride wallet.
3. Frontend shell (Vercel) → wire the engine → live ride screen.
4. Move the loop into a Cloudflare Worker cron so the ride survives a closed tab.

---

## Update — 2026-08-23
- **Repo hygiene for submission.** Withdrew the 5 internal briefs (build plan + research + briefs) into a local, git-ignored `_local/` folder — kept on disk, removed from the public repo. Public tree is now judge-facing only: `README.md`, `PROGRESS.md`, `package.json` / `package-lock.json`, `scripts/smoke.mjs`, `.github/workflows/smoke.yml`, plus git config.
- **Added `README.md`** — product pitch, how the ride + guardrails work, architecture table (Vercel frontend / Cloudflare Worker cron / capped ride wallet / chain as source of truth), tech stack, honest build status, and smoke-test instructions.
- Confirmed CI still green after cleanup.
- **Engine foundation landed + type-checks GREEN in CI.** Added `tsconfig.json` (noEmit, strict, moduleResolution Bundler) and a second CI workflow `typecheck.yml` (`npm ci` → `npm install --no-save typescript@5` → `tsc --noEmit`) so the engine is compiler-verified in the cloud without touching the PC. Wrote the portable, browser/Worker-safe foundation: `src/config.ts` (endpoints + proven testnet addresses, matches the green smoke test; `baseConfig()` boots read-only; `OPERATOR_ID=2` pins the venue), `src/types.ts` (`RideConfig`, `Guardrails`, `RidePhase`, `StopReason`, `RideState` — pure data, no imports), `src/exchange.ts` (`connect()` read-only → `attachRideWallet()` / `detachSigner()` via `setSigner`). Verified via SDK `.d.ts` that all three signer fields are optional, so read-only construct + `setSigner({})` detach both compile. **Both `smoke` + `typecheck` pass on commit `9ad8717`.**
- **NEXT: the engine state machine** (`src/engine.ts`) — find current window → size bet → place → watch/settle → claim → apply guardrails → roll, exposing `step()` (one tick, for the Worker cron) and `run()`. Read exact `listLiveBinaryMarkets` / `quoteBinaryStake` / `createOrder` / `getClaimable` / `redeemMany` signatures from the installed `.d.ts` first, then commit so CI type-checks it.

## Update — 2026-08-24
- **Decision brain landed → `src/rules.ts` (committed).** Pure logic — no network, no wallet, no clock, just numbers in / decision out — so the engine, the frontend, and the Worker share the exact same rules with zero drift. Holds: direction↔outcome mapping (**Up = YES = outcome 0, Down = NO = outcome 1**), `buySideForDirection` (BUY_YES / BUY_NO), `didWin`, `nextStake` (whole pot rides; a one-liner switches it to "ride only the profit" later), and `evaluateGuardrails` (priority: cash-out target → stop-loss → max rounds). Type-checks green.
- **✅ `src/engine.ts` DONE — authored, SDK-verified line-by-line, pushed for CI.** The `RideEngine` state machine that wires everything together: **IDLE** (check guardrails → find the current Trading window → size the whole pot → quote → place a MARKET/IOC order) → **HOLDING** (poll on-chain until resolved/voided) → **CLAIMING** (`redeemMany` the winnings) → **ROLLING** (count the round, clear the market) → back to **IDLE**. Guardrails from `rules.ts` are checked before every roll. Two drive modes: **`step()`** advances exactly one beat and never blocks (what the Worker cron calls each tick), **`run()`** loops `step()` with a poll delay until the ride ends. It **never throws** — any failure lands the ride in the `ERROR` phase with a readable message. Win/loss/void is read FRESH from `getMarketOnchain` every beat (no in-memory flag), so a Worker that persists only `RideState` can resume mid-ride correctly.
  - **Verified against the installed SDK `.d.ts` before pushing** (so the typecheck job passes first try; the SDK types live where a future session can re-open them fast): `client.listLiveBinaryMarkets({operatorId,asset,intervalSec})` returns soonest-first → we re-check on-chain `status===1 (Trading)`; `client.quoteBinaryStake({pool,side,stake})` → `BinaryStakeQuote { yesPrice, quantity }` (both `bigint`); `trader.placeOrder({pool, side, price: yesPrice, quantity, orderType: ORDER_TYPE.MARKET, builder?, builderFeeBpsTimes1k?})`; `client.getClaimable(account)` → `ClaimablePosition { marketId, outcomeIdx:0|1, amount }` feeds `trader.redeemMany({entries})` directly; the pot is re-read from `client.getErc20Balance(collateral, wallet)` and converted with `toHuman`. Buy-side literals confirmed: `BinaryBuySide = "BUY_YES" | "BUY_NO"`. (Type sources in `node_modules/@somnia-chain/markets-sdk/dist/`: `derivedReads.d.ts` = quotes/claimable/buy-sides, `trade.d.ts` = placeOrder/redeemMany, `markets.d.ts` = BinaryMarket/MarketOnchain, `somniaMarketsClient.d.ts` = the client read methods.)
  - **Two fixes applied from that review:** (1) `pool` typed as viem **`Address`** (not `string`) — `placeOrder`'s `pool` is `Address` and `string` isn't assignable under `strict`; (2) the collateral address is read from our own typed **`ADDRESSES.collateral`** (`src/config.ts`) instead of poking at the SDK's internal `client.config` shape. `tsconfig` has `strict` on but NOT `exactOptionalPropertyTypes`, so passing `builder: undefined` is fine.
  - **✅ CI GREEN on `a2eb238`** — both `typecheck` (`tsc --noEmit` compiled the engine clean, first try) and `smoke` (testnet still reachable) pass. **← NEXT:** build the frontend shell (Vite + React on Vercel) and wire it to the engine's `step()`/`run()`.
