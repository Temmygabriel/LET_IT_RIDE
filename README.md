# Let It Ride

**Bet once, then let a winning streak ride itself — automatically, with a built-in seatbelt.**

Let It Ride is a consumer app built on top of [DreamDEX Event Contracts](https://app.dreamdex.io/event-contracts) on the [Somnia](https://somnia.network) network. You pick an asset, a direction, and a stake. If you win, your winnings automatically roll into the next round in the same direction — and keep rolling — until you hit a limit you set in advance or press **Stop**.

It turns a string of manual bets into one disciplined, hands-off decision.

---

## What are "Event Contracts"?

Event Contracts are simple **Up / Down markets on the price of BTC and ETH**, on repeating short timers (every 15 minutes or every hour). At the start of a window the opening price is recorded; when the window closes, the market settles automatically on-chain against that opening price. "Up" wins if the price finished higher, "Down" wins if it finished lower.

A few things that make them a good fit for this app:

- **You can only ever lose your stake.** Every position is fully backed — no leverage, no liquidation, no surprise debt.
- **Settlement is automatic.** Somnia's on-chain reactivity settles each window without anyone pressing a button.
- **Fees are zero** at the protocol level.

## How the ride works

```
  You set:  asset (BTC/ETH) · direction (Up/Down) · starting stake · guardrails
                                   │
                                   ▼
        ┌─────────────────────────────────────────────┐
        │  place bet on the current window             │
        │  wait for it to settle                        │
        │                                               │
        │   won?  ──yes──►  guardrail hit? ──no──┐      │
        │    │                    │              │      │
        │    no                  yes             │      │
        │    │                    │        roll winnings│
        │    ▼                    ▼         into next    │
        │  stop &               stop &      same-way     │
        │  report              cash out     window ──────┘
        └─────────────────────────────────────────────┘
```

**Guardrails** are the seatbelt. Before the ride starts you choose any of:

- **Cash-out target** — stop and bank it once the pot reaches an amount you name.
- **Stop-loss** — a floor; the ride ends if things turn.
- **Max rounds** — never roll more than N times.

You can also press **Stop** at any moment. The ride never rolls past a limit you set.

## Architecture

Everything runs on free infrastructure. Nothing runs on your own machine.

| Piece | Where it runs | Job |
|---|---|---|
| **Frontend** (Vite + React) | Vercel | Set up a ride, watch it live, start/stop |
| **Roll engine** (portable TypeScript) | Deno Deploy (cron) | Every window: check the result, claim winnings, apply your guardrails, place the next bet — so the ride keeps going even after you close the tab |
| **Ride wallet** | Held by the runner | A small, capped, revocable wallet that funds the ride. Your main wallet is never exposed. |
| **Source of truth** | Somnia chain | Positions and settlement are read straight from the chain, not a cache |

The engine is written as a single portable TypeScript state machine so the exact same logic can be type-checked in CI, run on a scheduled cloud runner, or run in a browser tab.

### Why a "ride wallet"?

For the auto-roll to survive you closing your laptop, *something* always-on has to place the next bet. That something is a small always-on cloud runner (Deno Deploy). Rather than hand it your real wallet, you fund a **small capped ride wallet** — bounded, stoppable, and withdrawable at any time. It's an honest trade-off, clearly framed: the most you can ever put at risk is what you load into it.

## Tech

- [`@somnia-chain/markets-sdk`](https://www.npmjs.com/package/@somnia-chain/markets-sdk) — official SDK for reading markets and placing/settling positions
- [viem](https://viem.sh) — Ethereum library used under the SDK
- TypeScript · Vite · React · Deno Deploy · Vercel
- CI: GitHub Actions

## Project status

This is an active hackathon build. Current state:

- ✅ **Connects to Somnia testnet** and reads live BTC/ETH Up/Down markets
- ✅ **Read-only smoke test runs green in CI** on every push (see [`.github/workflows/smoke.yml`](.github/workflows/smoke.yml))
- ✅ **Roll engine** (find → place → watch → claim → decide → roll) — type-checked in CI
- ✅ **Always-on runner** (Deno Deploy) — cron auto-roll + HTTP API for the frontend, built with a `deno check` CI job ([`.github/workflows/runner.yml`](.github/workflows/runner.yml)); wiring the live deploy
- 🚧 **Frontend** (setup / live view / stop) — next

## Running the smoke test

The smoke test is read-only — it connects to the public testnet, lists live markets, and reads one market snapshot. No wallet, no funds, no keys needed.

```bash
npm ci
npm run smoke
```

## Safety model

- **Max loss = your stake.** Positions are fully collateralized; there is no leverage.
- **The ride wallet is capped.** You decide how much to load; the rest of your funds are untouched.
- **Guardrails are enforced before every roll**, and **Stop** always works.

## Hackathon

Built for the **Somnia × DreamDEX Event Contracts** hackathon (2026).

---

*Not financial advice. Testnet software — use at your own risk.*
