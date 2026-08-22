# Let It Ride — SDK Verification Research

**Research date:** 21 August 2026  
**Scope:** DreamDEX Event Contracts on Somnia; non-custodial auto-roll architecture  
**Primary source brief:** `sdk-verification-brief.md`  

---

## Executive Summary

The current DreamDEX bot-kit confirms that there is a real **split-key / operator authorization model** for DreamDEX trading, but the documented implementation is for the **SpotPool trading stack**, not the Event Contract stack.

Event Contracts use a separate `ec-core` package built on `@somnia-chain/markets-sdk`. The Event Contract examples currently construct the SDK with a normal `privateKey` and send state-changing transactions through the SDK's trader layer. I did **not** find an Event Contract equivalent of the spot `OperatorPermissionsRegistry` / `placeOrderFor` mechanism, nor an official browser React session-key abstraction for Event Contracts.

For settlement detection, the official Event Contract examples use **polling of authoritative on-chain market state**. The settlement watcher defaults to a 15-second polling interval. The bot-kit explicitly warns that the indexer can lag the chain by seconds, so the chain should be treated as the source of truth for anything that triggers a write.

For order placement, the Event Contract order path is real and usable from a JavaScript/TypeScript signer environment, but its current `placeOrder` path does **not** expose the spot builder-fee arguments `builder` and `builderFeeBpsTimes1k`. I therefore could not confirm that the requested builder-fee revenue model exists for Event Contracts.

Somnia's general Reactivity system can execute Solidity handlers in response to on-chain events, but I could not find an official example proving the complete Event Contract flow: a user-deployed contract receiving the settlement event, calling the EC order interface, and re-arming the next window with no backend. Current Somnia documentation also treats Reactivity as a testnet capability, so it should not be assumed to be the production-mainnet path.

### Bottom line

The two largest risks are:

1. **Non-custodial EC delegation is unconfirmed.** The existing session-key/operator machinery is clearly real for spot, but not proven for Event Contracts.
2. **EC builder-fee monetization is unconfirmed.** Builder fees are visible in the spot order API, but the current EC order code does not pass them.

A sensible first implementation is therefore a **testnet EC proof-of-concept** that validates order placement, authoritative settlement detection, claim/redeem, and next-window discovery. The final user-facing non-custodial architecture should wait for explicit confirmation that Event Contracts support bounded delegated authorization and builder fees.

---

# Q1 — Non-custodial “session keys” from a browser

## Verdict

**Partial overall; No / Could not confirm for Event Contracts in a browser.**

## What the brief required

The product requires temporary, limited authorization that can place the user's next Event Contract order without the app gaining unrestricted control over the user's money. The brief specifically asks whether the SDK or bot-kit supports:

- delegated / scoped trading authorization;
- browser creation and use;
- spend/allowance caps;
- expiry;
- market/order-type restrictions;
- revocation;
- one-signature vs multi-step approval;
- exact SDK functions / React hooks / contract calls.

Source brief: `sdk-verification-brief.md`, Q1.

## Evidence: split-key/operator model exists for spot

The bot-kit contains `docs/session-keys.md`, which explicitly describes a split-key model:

- **Fund key / owner:** holds funds, deposits working capital, grants operator permission, and is the only key that can withdraw.
- **Operator key / bot:** can place and cancel orders on the owner's behalf but cannot deposit, withdraw, or grant approvals.
- Authorization is recorded on-chain in an `OperatorPermissionsRegistry`.
- Permissions are granted per function selector.
- Revocation is immediate.
- Fills settle to the owner rather than the operator.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/session-keys.md

The documented setup is:

```ts
import { createChainContext, Pool, setManualVaultMode, depositVault, grantOperator } from "@dreamdex-bot-kit/core";

// owner (fund key) — one-time:
const fund = createChainContext(FUND_KEY);
await setManualVaultMode(fund, poolAddress, true);
await depositVault(fund, poolAddress, usdsoAddress, amountRaw);
await grantOperator(fund, poolAddress, operatorAddress); // place + cancel

// operator (bot) — set ctx.owner and just trade:
const op = { ...createChainContext(OPERATOR_KEY), owner: fundAddress };
const pool = await Pool.load(op, "USDC.e:USDso");
await pool.place({
  isBid: true,
  price: 0.9999,
  qty: 5,
  orderType: 3 /* PostOnly */,
}); // → placeOrderFor
```

The same documentation states that the operator can place/cancel orders but cannot deposit, withdraw, or grant approvals.

## Critical distinction: Event Contracts use a separate core

The Event Contract documentation in the same repository states that EC strategies use:

```text
@dreamdex-bot-kit/ec-core
```

built on:

```text
@somnia-chain/markets-sdk
```

rather than the spot contract path.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md

The EC package itself declares:

```json
{
  "name": "@dreamdex-bot-kit/ec-core",
  "dependencies": {
    "@somnia-chain/markets-sdk": "^0.25.0"
  }
}
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/package.json

## EC signer requirement

`packages/ec-core/src/exchange.ts` constructs `SomniaMarkets` and passes in a private key when writes are enabled:

```ts
export function createExchange(opts: { withSigner?: boolean } = {}): EcContext {
  loadEnv();
  const config = loadConfig();

  if (opts.withSigner && !config.privateKey) {
    throw new Error(
      "PRIVATE_KEY is required for trading. ..."
    );
  }

  const exchange = new SomniaMarkets({
    indexerUrl: config.indexerUrl,
    chain: makeChain(config),
    wsRpcUrl: config.wsRpcUrl,
    addresses: config.addresses,
    priceFeed: config.priceFeed,
    privateKey: opts.withSigner ? config.privateKey : undefined,
  });

  return {
    exchange,
    config,
    canTrade: Boolean(config.privateKey),
  };
}
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/exchange.ts

The current EC examples therefore demonstrate a normal signer/private-key automation model, not the spot operator-key delegation model.

## What I could and could not confirm

### Confirmed

- A split-key/operator authorization system exists in the DreamDEX bot-kit for the spot stack.
- It is on-chain and function-selector scoped.
- It can be revoked immediately.
- The operator cannot withdraw the owner's funds.

### Not confirmed for Event Contracts

I did not find an Event Contract equivalent of:

- `OperatorPermissionsRegistry` authorization for EC pools;
- `placeOrderFor` / `cancelOrderFor` in the EC order path;
- a browser session-key creation API;
- a React hook for EC delegated authorization;
- a documented EC allowance/spend cap;
- an EC-specific authorization expiry;
- a documented EC restriction by market/order type;
- an EC browser flow where the user signs once and the app can repeatedly submit future Event Contract orders.

I therefore would **not assume** the spot session-key system can be reused for EC.

## Browser implications

A browser can technically work with EVM transaction signing through a wallet provider, but that is not enough for Let It Ride's requirement.

There is a major difference between:

```text
User signs every transaction
```

and:

```text
User grants bounded authorization once
→ app can place future orders within the bound
→ app cannot withdraw or freely spend funds
→ user can revoke
```

Only the second pattern satisfies the intended session-key requirement.

## The gotcha

The phrase **“session key” should not be applied generically to the whole DreamDEX stack**. The repository proves the capability on the spot side but does not prove it on the Event Contract side.

Treating the spot implementation as if it were automatically available for EC is the main Q1 architectural trap.

## Recommended alternative

The documented alternative is the **owner/fund-key + hot operator-key** pattern, but that implementation is explicitly documented for the spot stack.

For EC, the repository currently points toward a normal signer/private-key bot. That gives automation but does not, by itself, satisfy the user's requested non-custodial UX.

Therefore the recommended product decision is:

> **Do not lock the production Let It Ride architecture to an EC browser session key until DreamDEX confirms that EC supports delegated authorization.**

---

# Q2 — Roll timing: detecting a settled window and placing the next bet

## Verdict

**Partial. Polling is confirmed; an EC-specific first-class settlement callback/hook is not confirmed.**

## Evidence: official EC settlement watcher

The bot-kit ships `strategies/ec-settlement/src/index.ts`.

It uses a 15-second polling interval by default:

```ts
const POLL_MS = envNum("WATCH_POLL_MS", 15_000);
```

Each loop obtains an authoritative on-chain market snapshot:

```ts
const onchain = await marketOnchain(ctx, market);

if (onchain) {
  if (onchain.status !== last) {
    log(`status → ${statusName(onchain.status)}`);
    last = onchain.status;
  }

  if (onchain.isResolved || onchain.isVoided) {
    const outcome = onchain.isVoided
      ? "VOID (both 0.5)"
      : `${onchain.winningOutcome === 0 ? "YES" : "NO"} wins`;

    log(`settled: ${outcome}`);
    await redeemHoldings(ctx, market, onchain);
    break;
  }
}
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/strategies/ec-settlement/src/index.ts

This is strong evidence that the supported reference implementation currently uses polling to detect settlement.

## Authoritative on-chain status

The EC market helper defines:

```ts
export const MARKET_STATUS = {
  Listed: 0,
  Trading: 1,
  Locked: 2,
  Settling: 3,
  Resolved: 4,
  Voided: 5,
} as const;
```

and explicitly says:

```ts
export const isTradable = (onchain: MarketOnchain): boolean =>
  onchain.status === MARKET_STATUS.Trading;
```

The surrounding comments make the intended rule explicit: gate writes on the authoritative on-chain status, not the lagging indexer status.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/markets.ts

## Why this matters

The bot-kit explicitly warns that indexed rows can lag the chain by seconds.

For a 15-minute or 1-hour auto-roll market, that means the roll engine should not simply do:

```text
indexer says settled → place next order
```

Instead it should do:

```text
identify current market
→ read authoritative on-chain snapshot
→ confirm Resolved / Voided
→ determine result
→ identify next Trading market
→ submit next order
→ verify transaction result
```

## How fast can Let It Ride know?

The official reference watcher uses 15-second polling by default.

So the documented baseline is roughly:

```text
settlement visible on-chain
→ next poll
→ application notices
→ transaction is submitted
```

With the default watcher, detection latency can therefore be close to the polling period in the worst case, before transaction propagation/inclusion.

There is no source-backed guarantee in the material reviewed that says, for example:

- “settlement notification is delivered within 100 ms”; or
- “the next market always opens X seconds after resolution.”

Do not invent such a guarantee in the product design.

## Can the app subscribe instead of polling?

Somnia provides generic WebSocket / Reactivity infrastructure, and the EC exchange configuration includes a WebSocket RPC URL.

However, I did not find an official Event Contract-specific SDK callback such as:

```ts
onSettlement(...)
```

or a documented React hook that directly reports “market X just settled.”

Therefore the safe conclusion is:

> **EC polling is confirmed; a first-class EC settlement callback is not confirmed.**

## Can the next bet be pre-placed?

I could not confirm a supported pre-placement mechanism.

The bot-kit gates Event Contract writes on:

```ts
onchain.status === Trading
```

and warns that only the `Trading` state accepts orders.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/markets.ts

Therefore, do not design the auto-roll assuming the next round can be populated before the current one settles unless a test against the deployed contracts proves that behavior.

## Rate limits

I could not confirm a published Event Contract-specific rate limit for:

- indexer reads;
- WebSocket subscriptions;
- market status reads;
- order writes.

The current source demonstrates polling-based operation but does not provide a defensible universal limit to quote.

## Additional operational gotchas from the EC bot-kit

The Event Contract documentation highlights several issues relevant to an auto-roll engine:

### 1. Gate on-chain status, not the indexer

Indexer rows can lag by seconds.

### 2. Reverted writes may not throw

The EC code uses an `assertTxOk` helper because the SDK can resolve a write response even when the transaction receipt reports `reverted`.

### 3. Do not pass ordinary JS floating-point prices blindly

On an 18-decimal venue, values such as `0.05` can become `0.050000000000000003` through `toFixed(18)`, landing off the tick grid.

### 4. Order expiry is mandatory

The EC order helper always calculates an expiry and caps it at the market's own expiry.

### 5. Venue lots matter

The generic SDK amount conversion does not necessarily give the correct Event Contract lot sizing.

### 6. Pools are recycled

Market identity should be keyed by `marketId` / symbol rather than by pool address alone.

### 7. Settled markets leave the live market list

A settled market is no longer in the active list, so a winning-position scanner must query finalized binary markets rather than simply filtering `loadMarkets()` for inactive rows.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md
- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/markets.ts

---

# Q3 — Placing an order from the frontend, with the builder fee

## Verdict

**Partial. Event Contract order placement is confirmed in the SDK/bot-kit, but the requested builder-fee mechanism is not confirmed for Event Contracts.**

## Evidence: actual EC order call

The key implementation is `packages/ec-core/src/orders.ts`.

The helper eventually sends:

```ts
const res = await ctx.exchange.trader.placeOrder({
  pool: onchain.pool,
  side: SIDES[`${outcome}-${side}`],
  price: priceYes,
  quantity,
  outcomeToken: onchain.outcomeToken,
  yesId: onchain.yesId,
  noId: onchain.noId,
  orderType:
    type === "post-only"
      ? ORDER_TYPE.POST_ONLY
      : type === "ioc"
      ? ORDER_TYPE.MARKET
      : ORDER_TYPE.LIMIT,
  expireTimestampNs: BigInt(expiresAt) * 1_000_000_000n,
});
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/orders.ts

Notice what is not present:

```text
builder
builderFeeBpsTimes1k
```

Those parameters are not part of this EC-core call.

## Spot builder fees are a different story

The DreamDEX spot documentation exposes `builder` and `builderFeeBpsTimes1k` on the spot `placeOrder` function.

That makes the builder-fee concept real for the spot protocol path.

However, I did not find an equivalent Event Contract call in the current EC code.

Therefore:

> **Do not assume Let It Ride can earn builder fees from EC orders simply because DreamDEX supports builder fees elsewhere.**

The current research does not establish an EC builder-fee revenue path.

## Event Contract order types

The EC core supports these high-level order choices:

- `post-only` — rests or is rejected, never takes;
- `ioc` — takes what it can and cancels the remainder;
- `limit` — can take and then rest the remainder.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/orders.ts

For an auto-roll product, `ioc` is generally the safer conceptual fit if the product wants a single, immediate position and does not want hidden resting exposure.

The bot-kit itself warns that an unfilled limit remainder can remain resting with escrow locked.

## Minimum order size

There is no single clean universal minimum I would hard-code.

Current configuration comments say:

### Mainnet

- decimals: 18;
- default tick: `1e15` raw units;
- default lot: `1e15` raw units;
- therefore 0.001 share as a configured lot.

### Testnet

- decimals: 6;
- measured order acceptance down to 1 raw unit in the current environment.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/config.ts

Because venue parameters can change, the application should treat these values as deployment/venue configuration rather than as immutable protocol constants.

## “Mint-a-pair” and matching

The EC starter strategy seeds inventory before executing sells:

```ts
if (!seeded.has(market.symbol)) {
  if (!ctx.config.dryRun) await seedInventory(ctx, market, onchain);
  seeded.add(market.symbol);
}
```

The order layer explicitly explains why:

```text
Selling needs inventory — mint a complete set first, there is no naked short.
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/strategies/ec-starter/src/index.ts
- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/orders.ts

The important product implication is that a normal user-facing “Up” or “Down” purchase does not mean the protocol offers unrestricted naked shorting on the opposite leg.

## Testnet setup

The current EC config indicates:

```text
NETWORK=testnet
chainId=50312
RPC=https://api.infra.testnet.somnia.network
WS=wss://api.infra.testnet.somnia.network/ws
```

and the configuration comments state:

- testnet collateral uses **6 decimals** and is represented as `tUSDC` in the current EC configuration;
- mainnet collateral uses **18 decimals** and is the USDso venue.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/config.ts

### STT testnet funds

Current Somnia network documentation lists the official testnet chain information and current testnet funding route.

Official source:

- https://docs.somnia.network/developer/network-info

The research therefore does **not** support retaining the older assumption that the official STT process is specifically “via a Telegram group.”

## The gotcha

The product brief assumes three things that are not safe to conflate:

1. EC order placement exists — **confirmed**.
2. Spot builder fees can be attached to an EC order — **not confirmed**.
3. The spot session-key/delegation system can execute EC orders — **not confirmed**.

The practical lesson is to treat Event Contracts as their own integration surface, not as “spot with different market names.”

---

# Q4 — Fully on-chain, no-server version

## Verdict

**Partial / Could not confirm the complete Event Contract implementation.**

## What Somnia Reactivity provides

Somnia's general Reactivity system supports event-triggered execution and can invoke Solidity handlers without an external keeper/bot.

Relevant official Somnia documentation:

- https://docs.somnia.network/developer/reactivity/what-is-reactivity
- https://docs.somnia.network/developer/reactivity/tutorials/solidity-on-chain-reactivity-tutorial
- https://docs.somnia.network/developer/reactivity/tooling/subscription-management

The architectural pattern is broadly:

```text
on-chain event
    ↓
Somnia Reactivity subscription
    ↓
Solidity handler
    ↓
read state / perform action
```

That is technically aligned with the idea of an on-chain auto-rearming contract.

## What remains unconfirmed

I could not find an official Event Contract example demonstrating all of the following together:

1. a user-deployed contract places an Event Contract order;
2. the user-deployed contract subscribes to that Event Contract's settlement callback;
3. the callback handler determines the user's win/loss;
4. the handler automatically places the next Event Contract order;
5. no backend or keeper is required.

The existing EC bot-kit does not ship this as its reference implementation. Its examples remain signer-driven TypeScript processes.

## Important distinction: Reactivity is not delegation

Even if the full Reactivity flow works, Reactivity only solves **how the automation wakes up**.

It does not automatically solve:

- whose funds are controlled by the contract;
- how much the contract may spend;
- which markets it may trade;
- how long authorization lasts;
- how the user revokes it;
- whether the contract can be upgraded or drained.

So a fully on-chain solution still needs a well-defined authorization/storage model.

## Production concern

Current Somnia documentation describes Reactivity availability in the context of testnet tooling. That means the concept is excellent for a prototype and technical demonstration but should not be assumed to be the production-mainnet dependency for Let It Ride without reconfirming current network availability at implementation time.

## The gotcha

A “fully on-chain” story sounds like it removes the server, but it does not automatically solve the harder product requirement:

> **the user's funds must remain under bounded, revocable control.**

That is still fundamentally an authorization/custody problem.

---

# Cross-cutting findings that matter to Let It Ride

## 1. Use `marketId`, not pool address, as primary market identity

The current EC stack recycles pools across successive markets.

The bot-kit explicitly warns:

> Markets die on schedule and respawn. Key state by `marketId` or symbol, never by pool address.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md

For Let It Ride this affects:

- current-round tracking;
- next-round discovery;
- idempotency;
- settlement history;
- stop-loss / max-round counters;
- reconnect/recovery logic.

## 2. Treat the blockchain as authoritative

Indexed market data can lag by seconds.

The correct source hierarchy for an action should be:

```text
on-chain market status
        ↓
indexer / SDK convenience data
        ↓
UI display
```

not the other way around.

## 3. A reverted SDK write may not throw

The current EC exchange code contains:

```ts
export function assertTxOk(
  res: { hash?: string; receipt?: { status?: string } },
  label = "transaction"
): void {
  if (res?.receipt?.status === "reverted") {
    throw new Error(
      `${label} REVERTED on-chain ...`
    );
  }
}
```

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/exchange.ts

This is especially important for an auto-roll loop. A transaction promise resolving is not enough evidence that the next round was actually placed.

## 4. Price precision is a real integration hazard

The EC bot-kit documents a specific 18-decimal issue:

```text
(0.05).toFixed(18)
→ "0.050000000000000003"
```

On an 18-decimal venue that can land off the tick grid.

The bot-kit therefore supplies its own `placeLimit` implementation that converts prices/sizes in integer tick/lot units rather than blindly using the SDK's float conversion.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/orders.ts

This is not a cosmetic implementation detail. An auto-roll product making a single order every 15 minutes cannot tolerate subtle off-grid rejection.

## 5. Order expiry is part of the safety model

The EC order helper requires an expiry timestamp and caps it at the market's own expiry.

For Let It Ride this is useful as a dead-man's switch:

- if the app crashes;
- if the browser disconnects;
- if a roll attempt arrives too late;

the order should not remain live beyond the market window.

## 6. Settlement requires explicit claiming/redeeming

The EC bot-kit documentation says winnings are **claimed**, not automatically returned to the wallet.

The strategies therefore periodically call `maybeClaim` / `claimSettled`.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md
- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/settlement.ts

This matters enormously for Let It Ride. A winning round does not automatically mean the next bet's collateral is sitting in a normal wallet balance.

Your roll engine has to explicitly account for:

```text
settlement
→ claim/redeem
→ resulting collateral balance
→ next-order sizing
→ next order
```

## 7. Voided markets are a separate path

The settlement helper explicitly handles voids separately:

- normal winner: payout based on the winning side and settlement fee;
- loser: zero;
- voided market: both sides refund 0.5.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/settlement.ts

This means Let It Ride should not simply encode:

```text
not winning = loss
```

A voided window needs its own transition and bankroll behavior.

## 8. The current EC settlement helper treats voids specially

`redeemOutcome()` goes through the raw trader path so the outcome is explicit, which is required for voided markets.

That is another sign that the auto-roll state machine should model:

```text
WIN
LOSS
VOID
UNSETTLED
```

rather than merely boolean win/lose.

## 9. EC price feeds are not the same thing as EC market prices

The bot-kit notes that a market row contains the Event Contract probability, not the underlying BTC/ETH spot price.

The testnet setup has a bundled underlying price-feed endpoint, while the current mainnet strategy path does not have a bundled mainnet price feed.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md
- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/config.ts

This matters only if Let It Ride itself later makes directional decisions from BTC/ETH spot rather than relying on the user's chosen direction.

## 10. Venue IDs are operationally important

The EC bot-kit warns that venue IDs can change and can diverge between networks.

The current helper therefore supports explicit `VENUE_ID` / `OPERATOR_ID` scoping and refuses to silently trade if live markets span multiple venues.

Source:

- https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/markets.ts

For production, the application should not hard-code a stale venue ID without a health check.

---

# Suggested Let It Ride architecture based on the evidence

## Phase 1 — Testnet proof of concept

Build the minimum loop around the currently confirmed EC primitives:

```text
Browser UI
   ↓
User chooses BTC/ETH + Up/Down + amount + roll guardrails
   ↓
User signs initial Event Contract order
   ↓
Track marketId
   ↓
Backend/automation process watches authoritative chain state
   ↓
Resolved / Voided
   ↓
Claim / redeem
   ↓
Evaluate:
  - win?
  - stop-loss?
  - cash-out target?
  - max rounds?
  - void?
   ↓
Locate next Trading market
   ↓
Submit next order
   ↓
Verify receipt status
   ↓
Repeat
```

This proves the business mechanics before committing to a delegation architecture.

## Phase 2 — Solve non-custodial delegation

There are three candidate paths:

### Path A — Native EC delegated authorization

Best outcome.

Requirements to confirm with DreamDEX:

- EC-specific operator authorization;
- bounded spend;
- expiry;
- market restrictions;
- revoke mechanism;
- browser wallet approval flow;
- whether it is implemented in `@somnia-chain/markets-sdk`.

### Path B — Smart-contract wallet / account abstraction

Possible alternative if EC contracts can accept calls through a user-controlled smart account.

Requirements:

- spend policy enforcement;
- user-controlled revocation;
- correct recipient/owner semantics for Event Contract positions;
- gas abstraction or gas funding model.

### Path C — Backend signer

This is the easiest automation path but carries the biggest custody/product-trust tradeoff.

It should only be considered acceptable if the signer controls a dedicated capped vault/account and the user-facing product clearly defines that custody model.

---

# Decision table

| Question | Verdict | What is proven | Main uncertainty | Product implication |
|---|---|---|---|---|
| Q1 Session keys | **Partial** | Split-key/operator model exists for spot | EC equivalent not confirmed | Do not lock final UX to browser auto-roll yet |
| Q2 Roll timing | **Partial** | EC settlement polling + authoritative on-chain status | No confirmed EC callback / timing guarantee | Use on-chain polling with event/WebSocket optimization later |
| Q3 EC order placement + builder fee | **Partial** | EC order placement is implemented | Builder fee not present in EC call | Do not count builder revenue until confirmed |
| Q4 Fully on-chain Reactivity | **Partial / Couldn't confirm** | Somnia Reactivity can run Solidity handlers | Full EC order→settlement→re-arm flow not demonstrated | Strong future architecture, not first-version dependency |

---

# Questions to send DreamDEX before production architecture is finalized

The research leaves a short list of high-value questions that should be answered directly by the protocol team.

## Delegation / non-custodial

1. Does the **Event Contract** venue implement `placeOrderFor` or another delegated order entrypoint?
2. Is the spot `OperatorPermissionsRegistry` also enforced by the binary Event Contract pool/module?
3. Can authorization be limited by:
   - maximum collateral spend;
   - expiry timestamp;
   - specific venue/market;
   - specific order type?
4. Can a wallet revoke the authorization with one transaction?
5. Is there an official `@somnia-chain/markets-sdk` or React API for creating and managing this authorization?
6. Can the authorization be established from a browser with one wallet signature or does it require multiple transactions?

## Auto-roll timing

7. Is there a documented Event Contract settlement event that a frontend/backend can subscribe to?
8. Is there an SDK callback or WebSocket message specifically for binary-market resolution?
9. What is the guaranteed interval between one Event Contract's expiry and the next market entering `Trading`?
10. Can an order for the next market be placed before the current market is resolved?
11. Are there official RPC/indexer/order rate limits for EC automation?

## Monetization

12. Does the EC order interface support `builder` / `builderFeeBpsTimes1k`?
13. If not, what is the official Event Contract equivalent for builder revenue?
14. Is the builder fee charged on order placement, fill, settlement, or another event?
15. What is the maximum permitted EC builder fee?

## Reactivity

16. Can a user-deployed contract subscribe to an Event Contract settlement event?
17. Can that contract call the EC order-placement interface directly?
18. Is this supported on Somnia mainnet today, or only testnet?
19. Is there an official reference contract demonstrating the complete pattern?

---

# Primary sources

## User-supplied research brief

- `sdk-verification-brief.md`
- It defines the exact Q1–Q4 requirements and requested answer format.

## DreamDEX bot-kit — Event Contracts

- Event Contract overview / operational notes:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md
- EC market helpers and finalized-market scanning:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/markets.ts
- EC order implementation:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/orders.ts
- EC settlement implementation:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/settlement.ts
- EC exchange / signer implementation:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/exchange.ts
- EC configuration / chain and collateral settings:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/src/config.ts
- EC starter strategy:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/strategies/ec-starter/src/index.ts
- EC settlement watcher:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/strategies/ec-settlement/src/index.ts
- EC package manifest:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/ec-core/package.json

## DreamDEX bot-kit — delegation / session keys

- Spot split-key/operator documentation:  
  https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/session-keys.md

## Somnia official documentation

- Network information / chain configuration:  
  https://docs.somnia.network/developer/network-info
- Reactivity overview:  
  https://docs.somnia.network/developer/reactivity/what-is-reactivity
- Reactivity Solidity tutorial:  
  https://docs.somnia.network/developer/reactivity/tutorials/solidity-on-chain-reactivity-tutorial
- Reactivity subscription management:  
  https://docs.somnia.network/developer/reactivity/tooling/subscription-management

---

# Final assessment

The current evidence supports building an **Event Contract automation proof-of-concept**, but it does **not yet support committing to the originally imagined production architecture** in which a browser-created, bounded session key repeatedly auto-rolls a user's EC position and earns a builder fee on each order.

The most defensible architecture today is:

1. Treat Event Contracts as a separate integration surface from spot.
2. Use authoritative on-chain market state for roll decisions.
3. Use polling initially, with WebSocket/Reactvity optimizations explored later.
4. Explicitly verify transaction receipt status.
5. Explicitly claim/redeem settled positions.
6. Key state by market ID rather than pool address.
7. Treat builder-fee revenue as **unconfirmed** until DreamDEX verifies an EC mechanism.
8. Treat browser session-key delegation as **unconfirmed for EC** until the protocol team proves the exact contract/API path.

## Biggest surprise / risk

**DreamDEX has most of the primitives needed for delegated automation somewhere in its stack, but the current evidence does not show that the same primitives are available on Event Contracts. The spot session-key/operator model and spot builder-fee API should not be assumed to carry over to EC.**

That distinction is the central architectural risk for Let It Ride.
