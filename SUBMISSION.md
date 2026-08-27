# 📝 Let It Ride — Submission Write-up

Copy-paste source for the hackathon form. Two versions: a **short (≤1000 char)** one for
tight fields, and a **full** one for the main description. Fill the two placeholders marked
`⟨…⟩` before submitting.

**Tagline:** *We productize restraint. The seatbelt is the hero.*

**Links**
- Live app: https://let-it-ride-six.vercel.app/
- Runner (API): https://let-it-ride-1vmtcagg2s1m.temmygabriel.deno.net/
- Demo video: ⟨YOUTUBE_LINK⟩
- Code: ⟨GITHUB_REPO_URL⟩

---

## SHORT VERSION — ≤1000 characters (this one is ~910 chars)

Let It Ride — we productize restraint; the seatbelt is the hero.

Betting your whole pot on a coin-flip, then rolling it all into the next, has one ending: zero. So we didn't build the gamble — we built the seatbelt.

Let It Ride is a hands-off, disciplined auto-roller on DreamDEX Event Contracts. Pick BTC/ETH, Up/Down, a window and a stake — then set your guardrails first: auto cash-out, stop-loss, max rounds. You can't ride without a seatbelt on. It then places, settles, claims and rolls the whole pot automatically until one of YOUR limits hits — the win is walking away a winner, on rails you set.

It runs unattended in the cloud (cron + KV), not your browser: close your laptop and the ride keeps going. Real Event Contracts — fully collateralized, zero fees, no leverage; you only risk what you load in. Managed session wallet, not MetaMask. Every bet routes a small builder fee — that's the business.

---

## FULL VERSION — main description

**The hook.** "Let it ride" — bet your whole balance on a coin-flip, win, then let *all* of it
ride on the next flip — has exactly one mathematical ending: zero. It's the most tempting and
most ruinous way to trade. So we didn't build the gamble. **We built the seatbelt.**

**What it is.** Let It Ride is a hands-off, *disciplined* auto-roller on DreamDEX Event
Contracts. You pick a bet (BTC or ETH, Up or Down, a 15-minute or 1-hour window) and a starting
stake — and then, the whole point, you set your **guardrails before it runs**: an auto cash-out
target, a stop-loss floor, a hard cap on rounds. **You literally cannot start a ride without at
least one seatbelt on.** Then it runs itself: places the bet, waits for the window to settle
on-chain, claims the winnings, and rolls the entire pot into the next window — automatically,
until one of *your* limits is hit. The celebrated moment isn't endless gambling; it's **walking
away a winner, on rails you set in advance.**

**Why it's different.** Everyone else builds the casino. We built the discipline layer around
it. The guardrails *are* the product — they turn a reckless streak into a controlled,
walk-away-a-winner experience, and that's also what makes it read as production-grade rather
than a toy.

**How it works (the proof).** The ride runs **unattended in the cloud, not in your browser.** An
always-on runner (Deno Deploy: `Deno.cron` + `Deno.openKv`) drives a portable TypeScript state
machine that talks to Somnia through the DreamDEX markets SDK over WebSocket. Close the tab,
close your laptop — the ride keeps advancing on schedule. Reopen it and you're a round further,
having touched nothing. These are **real Event Contracts**: fully collateralized, zero fees, no
leverage — the most you can ever lose is what you loaded in, and the seatbelt stops you at your
own limit.

We use a **managed session wallet, not MetaMask — on purpose.** You can't approve a wallet popup
while you're away, and the entire product is hands-off; this is the same pattern automated
trading bots use. Forcing MetaMask in would break the one thing that makes the product real: it
keeps riding when you're gone.

**Business model.** Every bet routes a **small builder fee** to us, baked directly into the
order. The gamble is the demo, the discipline is the product, and the builder fee is the
business — revenue scales with usage, on infrastructure that's already free-tier.

**Built with.** Portable TypeScript roll-engine · Deno Deploy runner (WebSocket SDK + cron + KV)
· Vite + React frontend on Vercel · DreamDEX Event Contracts on Somnia testnet.

---

## One-liner (for a "tagline"/"elevator pitch" field)

A hands-off auto-roller for DreamDEX Event Contracts that rides your whole pot into the next
window automatically — but stops itself at the cash-out, stop-loss, or round cap you set first.
We productize restraint; the seatbelt is the hero.
