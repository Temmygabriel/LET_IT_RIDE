# SDK Deep-Dive Research Brief (Round 2) — for ChatGPT (web browsing ON)

**Read this first:** Round 1 (`let-it-ride-sdk-verification-research.md`) read the DreamDEX **bot-kit wrapper** (`@dreamdex-bot-kit/ec-core`) and found that delegation ("session keys") and builder-fees were only visible on the **spot** side, not the Event Contract (EC) side. But `ec-core` is just a thin wrapper around the underlying published SDK **`@somnia-chain/markets-sdk`**. Round 1 read **v0.25.0**; the current published version is **v0.28.0**. 

**So the real question this round:** does the **SDK itself** (v0.28.0) support these things for Event Contracts — even if the bot-kit wrapper doesn't pass them through? The authoritative answer is in the SDK's **actual source code and TypeScript type definitions**, not in the wrapper.

## Where to read the SDK (cite exact file + the type signature you find)

- npm page: https://www.npmjs.com/package/@somnia-chain/markets-sdk
- **Browse the actual files (best):** https://unpkg.com/browse/@somnia-chain/markets-sdk@0.28.0/ — open the `dist/` folder and read the **`.d.ts` TypeScript definition files**. These *define* the exact API — they can't be vague. Look especially at whatever type defines the trader / `placeOrder` / order params, and any market/settlement/subscription types.
- If the SDK has a public GitHub repo or changelog, read the changelog between 0.25.0 and 0.28.0 for anything about Event Contracts, operators, delegation, or fees.
- DreamDEX docs (append `.md` to any page): https://docs.dreamdex.io/developers/event-contracts

## What to search for inside the SDK type definitions

Grep/scan the `.d.ts` files for these exact strings and report every hit with the surrounding type:
`builder`, `builderFeeBpsTimes1k`, `placeOrderFor`, `cancelOrderFor`, `operator`, `Operator`, `permission`, `session`, `delegat`, `approve`, `permit`, `onSettle`, `subscribe`, `websocket`, `ws`, `event`.

## The questions (answer each with the exact type/signature as proof)

**A — Delegated / operator order entry for Event Contracts.**
Does the SDK expose a way to place an EC order *on behalf of* another address (an operator/delegated path), e.g. a `placeOrderFor`, an `owner`/`operator` field on the exchange or order call, or an on-chain permission registry the SDK talks to? Show the exact type. If it exists, can it be bounded (spend cap / expiry / market / order type) and revoked?

**B — Builder / referral fee on Event Contract orders.**
Does the SDK's EC order type accept `builder` and `builderFeeBpsTimes1k` (or any referral/fee field)? Paste the exact `placeOrder` (or equivalent) parameter type. If the field exists in the SDK but the bot-kit wrapper just doesn't pass it, say so clearly — that would mean the fee IS available to us.

**C — Settlement notifications (vs 15s polling).**
Does the SDK expose any subscription / callback / websocket for market status changes or settlement (something better than polling on-chain every 15s)? Show the method/type.

**D — Market discovery / next-window API.**
What SDK method lists current EC markets and identifies the *next* Up/Down window for BTC/ETH (by `marketId`/symbol)? Show the method + return type. Any field that tells us when the next window opens?

**E — Testnet: is it live and how do we fund it (as of now)?**
Confirm from https://docs.somnia.network/developer/network-info : current testnet chainId, RPC/WS URLs, how to get gas tokens (STT?) and test collateral (tUSDC?). Is the EC venue actually live on testnet right now?

**F — On-chain Reactivity for EC (stretch).**
Any newer official example of a user-deployed contract that places an EC order AND receives the settlement callback to re-arm — and is Reactivity on mainnet yet or testnet-only?

## Answer format (per question)

1. **Verdict:** Yes / No / Partial / Couldn't confirm.
2. **Proof:** exact file + the type signature or code you found (paste it), with the URL.
3. **Gotcha:** anything that limits or complicates it.

End with **"What changed since v0.25.0"** — anything in 0.28.0 relevant to Event Contracts, delegation, or fees.
