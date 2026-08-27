# 🎬 Let It Ride — Demo Video Guide

A practical, do-this-then-that guide for recording the submission video.
Written to be followed top-to-bottom. Target length: **~3 minutes** (judges
watch a lot of these — tight beats long).

---

## 1. What the judges are scoring (and how the video wins each)

The rubric is: **Technical 25% · UX 20% · Business 20% · Innovation 20% · Presentation 15%.**
The video is your one shot to hit *all five* in three minutes. Here's the mapping — every
beat below is chosen to score one of these:

| Judge cares about | What you show on screen |
|---|---|
| **Innovation (20%)** | The paradox: "letting it ride is math that ends at zero — so we built the seatbelt, not the gamble." |
| **UX (20%)** | The Setup screen making guardrails the hero; the calm, plain-English plan; the celebrated *disciplined exit*. |
| **Technical (25%)** | The **money shot** — close the tab, the ride keeps advancing in the cloud, reopen and it's a round further. Real on-chain Event Contracts on Somnia. |
| **Business (20%)** | One line: capped ride-wallet model today, **builder-fee revenue** on every bet (our cut is baked into the SDK order). |
| **Presentation (15%)** | Tight script, no dead air, one clear story. This guide is built for that. |

**The one sentence the whole video must land:** *"We productize restraint. The seatbelt is the hero."*

---

## 2. The honest timing problem (read this first — it shapes everything)

A real ride uses **15-minute windows** (the shortest DreamDEX offers). A full arc —
place → hold → settle → claim → roll, a few times, then a disciplined cash-out — takes
**30–60 minutes of real wall-clock time.** You cannot film that in real time.

**So do NOT try to record one continuous take.** Instead:

1. **Run a real ride for real** (it proves everything is genuine).
2. **Record the whole thing** in the background (screen recorder running the entire ~45 min).
3. **Edit it down** to the ~6 interesting moments, cutting the 15-minute "waiting" gaps.
4. Keep the **round counter and wallet balance visible** across cuts so a judge can see
   the numbers really moved — that's your proof it wasn't faked.

This is normal and expected for on-chain demos. Judges know windows take time; showing
real numbers advancing across honest cuts reads as *more* credible than a suspiciously
instant demo.

### Pick a config that completes inside one recording session
Set these on the Setup screen so a full, satisfying arc finishes in ~45 min and ends on a
*celebrated* exit (not a loss):

- **Window:** 15-minute (shortest).
- **Starting stake:** something small, e.g. 25 tUSDC.
- **Cash-out target:** reachable in 2–3 wins (with the ~even odds, set it modest, e.g. 2× stake).
- **Max rounds:** 3 (so even if wins are slow, it stops cleanly on the round cap — still a win in our story).
- Leave stop-loss off or very low, so the ride doesn't end on the sad path mid-demo.

> ⚠️ You're at the mercy of real market outcomes — a ride *can* lose. That's fine and even
> honest to show once, but for the hero take you want a disciplined **win** ending. Just
> re-run until you catch a good arc (each attempt is cheap testnet money). Record a couple
> of full runs so you have a winning one to cut from.

---

## 3. Pre-flight checklist (before you hit record)

Do all of this the day before, not while recording:

- [ ] **Runner is deployed and live** (Deno Deploy) and `GET /health` returns ok.
- [ ] **Frontend is deployed** (Vercel) with `VITE_RUNNER_URL` pointing at the live runner.
- [ ] **Ride wallet is funded**: STT for gas (Somnia faucet) **and** tUSDC (the in-app Faucet button).
- [ ] Open the app; confirm the **wallet strip** shows a real address + non-zero balances.
- [ ] Do **one full throwaway ride** end-to-end the day before, to confirm the whole loop
      works unattended and to learn the timing. Don't record this one — it's your rehearsal.
- [ ] Clean desktop: close Slack/email, silence notifications, hide bookmarks bar, use a
      clean browser profile. Nothing on screen you wouldn't want a judge to see.
- [ ] Zoom the browser to ~110–125% so text is readable when compressed to video.
- [ ] Write the ride config on a sticky note so you set it fast on camera.

**Recording tools (all free):**
- **OBS Studio** (best, free, any OS) — records screen + mic, lets you crop to the browser window.
- **Loom** (free tier) — dead simple, records screen + webcam bubble, gives a shareable link.
- Windows built-in: **Xbox Game Bar** (`Win+G`) for a quick screen capture.
- Mic: your earbuds' mic beats laptop built-in. Record somewhere quiet.

**Editing tools (free):** CapCut (easy, great for speed-ramps and captions), DaVinci Resolve
(more powerful), or Clipchamp (built into Windows).

---

## 4. The shot list (storyboard)

Six beats. Times are the *final edited* durations, not how long they take to film.

| # | Beat | ~Time | What's on screen | What you're proving |
|---|---|---|---|---|
| 1 | **The hook / paradox** | 0:00–0:20 | Title card or the app's landing header; your voice over it | Innovation |
| 2 | **Set the bet + the seatbelt** | 0:20–1:05 | Setup screen: pick BTC ▲ UP, stake, then set guardrails; the live "plan" text | UX + the thesis |
| 3 | **Buckle up & ride** | 1:05–1:40 | Hit ride → LiveRide screen: phase readout, pot, round, guardrail chips | It's real & on-chain |
| 4 | **The money shot** | 1:40–2:20 | Close the browser tab. Wait (cut). Reopen → ride advanced a round on its own | **Technical (the winner)** |
| 5 | **The disciplined exit** | 2:20–2:50 | Summary screen: "🎯 Cashed out on target — you walked away a winner" | UX + thesis payoff |
| 6 | **Close / business** | 2:50–3:00 | Back to a clean title or the tagline; one business line | Business + Presentation |

---

## 5. Word-for-word narration script

Read this aloud over the matching beat. It's written to sound spoken, not read. Tweak to
your voice, but keep the **bolded** lines verbatim — they're the ones that score.

> **Beat 1 — The hook (over the landing screen)**
> "Here's a bad idea: bet your whole balance on a coin flip. Win, and let *all* of it ride
> on the next flip. Keep going. The math on that has one ending — zero.
> **So we didn't build the gamble. We built the seatbelt.** This is Let It Ride."

> **Beat 2 — Setup (as you click)**
> "You pick the bet — say, Bitcoin finishes *up* over the next fifteen minutes — and your
> starting stake. But here's the part that matters." *(set the guardrails)*
> "Before it runs, you set how it *ends*: cash out automatically at a target, a stop-loss
> floor, a hard cap on rounds. **You literally can't start a ride without at least one
> seatbelt on.** And it tells you the plan in plain English before you commit."

> **Beat 3 — Ride (after hitting 'Buckle up & ride')**
> "Now it's live. This is a *real* Event Contract settling on Somnia — no fees, no leverage,
> fully collateralized. It places the bet, waits for the window to settle on-chain, claims
> the winnings, and rolls the whole pot into the next window. Hands-off."

> **Beat 4 — The money shot (close the tab, then reopen after a cut)**
> "Watch this. I'm going to close the tab completely." *(close it)*
> "This ride is **not** running in my browser. There's a worker in the cloud placing every
> bet and rolling every win on a schedule. So I can walk away…" *(cut — reopen the app)*
> "…come back a while later, and the ride kept going without me — we're a round further, the
> pot moved, and I didn't touch a thing. **I could throw this laptop in a lake and the ride
> continues.**"

> **Beat 5 — Disciplined exit (Summary screen)**
> "And here's the whole point. It didn't ride until it blew up — it hit *my* cash-out target
> and **stopped itself**, automatically. **The celebrated moment isn't endless gambling —
> it's walking away a winner, on rails you set in advance.**"

> **Beat 6 — Close**
> "Every bet routes a small builder fee to us — that's the business. But the product is the
> discipline. **Let It Ride. We productize restraint — the seatbelt is the hero.**"

*(Total spoken time reads at ~2:45–3:00 at a natural pace.)*

---

## 6. Editing tips that make it look pro

- **Cut the dead air ruthlessly.** Every 15-minute wait becomes a hard cut or a 1-second
  speed-ramp. Never make a judge wait.
- **Keep a visible anchor across cuts** — the round counter, the pot value, or the wallet
  balance — so the audience trusts the numbers really changed.
- **Add captions/subtitles.** Many judges watch muted first. CapCut auto-captions in a click.
- **Zoom in on the guardrail section** in Beat 2 and the "Cashed out on target" headline in
  Beat 5 — those are your thesis, make them fill the frame.
- **One background music track**, low volume, upbeat but not frantic. Cut it under narration.
- **Show a real timestamp or clock** during the money shot (Beat 4) to prove real time passed
  while the tab was closed — e.g. glance at a phone clock, or show the ride's "updated" time.
- **Top-left title card** for 2 seconds at the very start: "Let It Ride — Somnia × DreamDEX".
- End on the tagline as a still frame for 2 seconds so it's the last thing they read.

---

## 7. Do / Don't

**Do**
- Keep it under ~3 minutes.
- Lead with the paradox — it's your most memorable 20 seconds.
- Show *real* on-chain data (real address, real balance, real round changes).
- Rehearse the click-path once so you don't fumble live.

**Don't**
- Don't fake the loop with a mockup — the whole edge is that it's genuinely unattended.
- Don't read the script robotically; it's fine to sound like a person.
- Don't show your private key, seed phrase, or the runner's env vars *anywhere* on screen.
  (The ride-wallet **address** is fine; the key never appears.)
- Don't explain the tech stack line-by-line — judges can read the README. Sell the *story*.

---

## 8. Where to put it

- Record and edit locally. Export **1080p, MP4, ~30–60 fps**.
- Upload **unlisted on YouTube** (best for embedding + no size limits) or Loom.
- Put the link at the **top of the README** and in the submission form.
- Keep a local copy of the final file as backup.

---

### TL;DR
Run a real ride with a tight winning config, screen-record the whole ~45 min, then cut it to
six beats: **paradox → set the seatbelt → ride → close-the-tab-and-it-kept-going → disciplined
cash-out → tagline.** Land the line *"we productize restraint; the seatbelt is the hero,"* show
real numbers moving across honest cuts, keep it under three minutes.
