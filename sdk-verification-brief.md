# SDK Verification Brief — run this through ChatGPT (with web browsing ON)

**What this is:** Before we build our app ("Let It Ride"), we need to confirm 3 things the whole design rests on. Please research the questions below using the official sources, and answer in the exact format at the bottom. If you can't confirm something, **say so clearly** — "I couldn't find this" is a useful, valid answer. Don't guess or fill gaps with plausible-sounding invention.

---

## Context you need

- **Platform:** Somnia — an EVM-compatible Layer-1 blockchain. *(EVM-compatible = runs Ethereum-style smart contracts. Layer-1 = a base blockchain, not an add-on.)*
- **Product on top of it:** DreamDEX **Event Contracts** — auto-generated, recurring **binary Up/Down markets on BTC and ETH price only**, in 15-minute and 1-hour windows. Each window settles against its **opening price**. Zero fees, collateral in **USDso**, fully collateralized (max loss = your stake), no leverage. A **multi-source oracle auto-settles each market on-chain via Somnia "reactivity" — no keeper/bot needed to settle.** If the price feed is unreliable, the market **voids** and both sides redeem 0.5.
- **What we're building:** "Let It Ride" — a consumer web app. The user picks a direction (e.g. BTC Up), stakes once, and the app **auto-rolls** their winning position into the next window automatically (same direction), with guardrails (cash-out target, stop-loss, max rounds), until a rule stops it. Must be **non-custodial** — the app can place the user's next bet but must **never hold or freely spend their funds**.

## Where to look (official sources — cite the exact page/file for each answer)

- Docs: **https://docs.dreamdex.io/developers/event-contracts** — TIP: you can append `.md` to any docs page URL to get raw markdown, and the site supports a `?ask=` query.
- Bot Kit repo: **https://github.com/somnia-chain/dreamdex-bot-kit** — it reportedly ships ~6 Event-Contract example strategies (names like ec-starter, ec-maker, ec-passive, ec-laddering, ec-oracle-follow, ec-settlement). Read these examples closely — they likely show the real API usage.
- SDK package: **`@somnia-chain/markets-sdk`** (TypeScript; reportedly ships React hooks). Check its README / npm page / source.
- Bot builder tool: https://dreambot-builder.vercel.app/
- Note: the HTTP REST/WS API is reportedly **spot-only** — there may be **no REST API for Event Contracts** (SDK-only). Confirm or correct this.

---

## The 3 load-bearing questions (+ 1 stretch)

### Q1 — Non-custodial "session keys" from a browser  ← most important
A **session key** = a temporary, limited key that can place orders on the user's behalf **without holding their money**, and that the user can revoke.
- Does the markets-SDK and/or the bot-kit support session keys (or any equivalent "delegated / scoped authorization to trade")?
- Can it be created and used **from a browser web app**, or only from a Node.js server/bot?
- What limits can be set on it: a **spend/allowance cap**, an **expiry time**, restriction to **specific markets or order types**, and can the user **revoke it anytime**?
- How does the user approve it — one wallet signature? a contract call? multiple steps?
- Name the exact SDK functions / React hooks / contract calls involved, and paste any code example from the bot-kit.
- **Why we need it:** this is the core of non-custodial auto-roll. If it's not possible in-browser, we'll need a small backend signer or a different design — so we must know now.

### Q2 — Roll timing: detecting a settled window and placing the next bet in time
- When a window settles, how does an app **learn the result**? Is there an on-chain **event to subscribe to**, a **websocket feed**, an **SDK callback/hook**, or must we **poll**?
- How **fast** after settlement can an app know it won and place the next order?
- What's the **timing between one window closing and the next opening** — is there a gap, and can we **pre-place** into the next window before the current one settles (so we never miss a round)?
- Any **rate limits** on reads or order placement?
- **Why we need it:** the auto-roll must reliably land the next bet each round. This tells us whether we design around events or polling.

### Q3 — Placing an order from the frontend, with the builder fee
- Confirm the order-placing function (reportedly `placeOrder`) can be called **from a browser frontend on testnet**.
- What are its **exact parameters**? In particular the **builder-fee** params (reportedly `builder` and `builderFeeBpsTimes1k`): what do they do, what are valid ranges, and how/when is the fee paid to the app? *(A "builder fee" = a cut the platform pays an app for routing trades to it — our revenue.)*
- Is there a **minimum order size**? How does **"mint-a-pair"** work — do we need a matching counterparty for our order to fill, or does the protocol handle matching?
- **Testnet setup:** the RPC / chain-ID config, how to get **testnet funds** (reportedly "STT" tokens via a Telegram group), and how USDso works on testnet.
- **Why we need it:** this is the actual money-move each round, plus how we earn.

### Q4 (STRETCH — nice to have, not a blocker) — Fully on-chain, no-server version
- Can a **user-deployed contract** on Somnia both (a) **place Event Contract orders** and (b) **receive the on-chain auto-settlement callback** (Somnia "reactivity") so it **re-arms the next bet by itself, with no backend server**?
- If yes, what's the interface / an example? If unclear or unsupported, just say so.
- **Why we need it:** this would be the "fully on-chain, no server" production version — a strong technical + story win — but our first version does **not** depend on it.

---

## Answer format (please follow this for each question)

For **Q1, Q2, Q3, Q4** give:
1. **Verdict:** Yes / No / Partial / Couldn't confirm.
2. **Evidence:** the specific doc page or repo file that proves it (with the URL), and a **code snippet** if one exists.
3. **The gotcha:** any limitation, caveat, or thing we'd trip over.
4. If Q1 is No/Partial for the browser: **what's the recommended alternative** the docs/kit suggest?

End with a short **"Biggest surprise / risk"** line — anything you found that changes how you'd build this.
