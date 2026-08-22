# Let It Ride — Build Plan

*Somnia × DreamDEX Event Contracts Hackathon. Submissions Aug 25 – Sep 8, 2026.*

---

## The one-line pitch

**Pick a direction, stake once, and let your bet ride.** Every round (15 min or 1 hr), if you won, your stake + winnings roll into the next round automatically — same direction — until you hit your cash-out line, your stop-loss, or your round limit. Set it and watch it run.

*(Glossary: an "Event Contract" is a bet on whether BTC or ETH goes **Up** or **Down** by the end of a fixed time window. It settles by itself on-chain — nobody has to press a button. Winner takes the pot; loser loses only their stake. No leverage, no fees.)*

## Why this can win (maps to the judging weights)

- **Innovation (20%)** — Auto-rolling a position across recurring windows is a mechanic nobody else is shipping. Everyone else is building AI-reads-news bots and odds dashboards (we checked — those are saturated).
- **Technical (25%, the biggest slice)** — Non-custodial auto-execution is the hard, impressive part. "Non-custodial" = the app can place your next bet but **never holds your money**; it can only do what you pre-approved.
- **UX (20%)** — One knob to set ("ride ETH-up, cash out at 4 wins, stop if I lose"), then a live "watch it ride" screen. Simple enough for a non-crypto person.
- **Business / Ecosystem (20%)** — Every ride = many orders = recurring trading volume for DreamDEX. We collect a **builder fee** (the platform pays apps that route trades to it) — built-in revenue, clean ecosystem story.
- **Presentation (15%)** — The demo watches itself: "$10 rides 5 green windows into $80, then auto-cashes-out." That's a satisfying 2-minute video.

## What we are NOT building (keeps scope tight)

- The oracle / price feed → **already done** by DreamDEX.
- Settlement (deciding who won) → **already done**, auto-settles on-chain.
- A new exchange or order book → we build **on top of** DreamDEX, we don't rebuild it.

We build exactly one new thing well: **the disciplined auto-roll loop + a clean frontend for it.**

## The core loop (the whole product in 6 steps)

1. User connects wallet, funds a small allowance, and sets the rules: direction (e.g. BTC Up), stake, cash-out target, stop-loss, max rounds.
2. App places the first bet on the current window (through the DreamDEX SDK, with our builder-fee tag).
3. Window closes → it settles on-chain automatically.
4. App sees the result:
   - **Won** → roll stake + winnings into the next window, same direction (unless a rule says stop).
   - **Lost** → stop, show the run summary.
   - **Void** (price feed unreliable → market cancels, both sides get half back) → treat as a neutral stop, refund shown.
5. Repeat until a stop rule triggers (target hit / stop-loss / max rounds / user hits Stop).
6. Show a shareable run summary ("5 wins → 8×, cashed out").

## Screens (minimal, polished — 3 screens)

1. **Set up a ride** — asset + direction toggle, stake input, three rule sliders (cash-out, stop-loss, max rounds), a plain-English preview of what will happen.
2. **Live ride** — the hero screen. Current window countdown, live price vs. the opening price, the "stack" growing/shrinking each round, animated. A big **Stop** button (proves it's non-custodial and user-controlled).
3. **History** — past runs, PnL, a share card for each run.

## Tech stack

- **Frontend:** React + the DreamDEX markets SDK (`@somnia-chain/markets-sdk`, TypeScript, ships React hooks). Wallet connect + Somnia testnet.
- **Auto-execution:** session keys via the bot-kit (a scoped, temporary key that can place *only* the bets we allow, then expires — this is what makes it non-custodial). **← biggest thing to verify, see Risks.**
- **Monetization:** pass `builder` + `builderFeeBpsTimes1k` on every order.
- **Stretch (production version):** move the ride loop into an on-chain contract that re-arms itself using Somnia's auto-settlement callback — no server needed. Feasibility unconfirmed (see Risks). MVP does **not** depend on this.

## Biggest risks to verify BEFORE deep building

These are the load-bearing assumptions. If #1 is false, the MVP design changes. → Best handled as a short brief for ChatGPT / a docs check (token-frugal), not an in-session sweep.

1. **Session keys in a browser frontend.** Does the markets-SDK / bot-kit actually support non-custodial session keys from a web app? How is scope set (spend cap, expiry, which markets)?
2. **Roll timing.** After a window settles, is there an event/callback we can subscribe to, or must we poll? Can we detect the win and place the next bet before the next window opens?
3. **Ordering from the browser.** Confirm `placeOrder` with the builder-fee params works from a frontend on testnet.
4. **Stretch feasibility.** Can a user contract both place CLOB orders *and* receive the settlement callback via Somnia reactivity? (This is the "no server" production dream — nice-to-have.)

## Timeline (today is Aug 21; submit by Sep 8)

- **Aug 21–25 (pre-submission):** Plan locked. Verify Risks 1–3. Frontend shell + wallet connect + read/show live markets.
- **Aug 25–Sep 1:** Core ride loop live on testnet (place → watch settle → auto-place next). Guardrails (cash-out / stop-loss / max rounds). Non-custodial session-key flow.
- **Sep 1–Sep 6:** Polish the Live Ride screen + animation. Handle edge cases (void market, wallet disconnect, insufficient funds). Wire the builder fee. Share cards.
- **Sep 6–Sep 8:** Record the 2–3 min demo, write the README + the SDK feedback report (a required deliverable — treat it seriously), deploy, submit.

## Required submission checklist

- [ ] Working prototype on testnet
- [ ] GitHub repo
- [ ] 2–3 min demo video
- [ ] Thoughtful SDK + docs feedback report
- [ ] (Optional) slide deck
