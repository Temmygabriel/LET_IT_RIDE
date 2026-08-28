# 🎬 Let It Ride — Silent Demo Video Guide

A do-this-then-that guide for recording the submission video **with no voice-over** —
just Bandicam screen capture + on-screen caption cards + light background music.

Because there's no narration, **the captions and the app's own on-screen text are your
script.** Good news: the app now explains itself in plain English at every step (the live
screen literally tells you "win it and your whole pot rolls into the next one; lose it and
the ride ends"). Your job is to *let those words be readable* and add short caption cards
between beats.

**Target length: ~2 minutes.** Silent videos feel longer than narrated ones — keep it tight.

---

## 1. What the judges are scoring (and how each beat wins it)

Rubric: **Technical 25% · UX 20% · Business 20% · Innovation 20% · Presentation 15%.**

| Judge cares about | What you put on screen |
|---|---|
| **Innovation (20%)** | The paradox card: "letting it ride ends at zero — so we built the seatbelt, not the gamble." |
| **UX (20%)** | The Setup screen making the *seatbelt* the hero; the plain-English "plan" sentence; the celebrated **disciplined exit**. |
| **Technical (25%)** | The **money shot** — close the tab, the ride keeps advancing in the cloud, reopen and it's a window further. Real on-chain Event Contracts on Somnia. |
| **Business (20%)** | One caption: capped ride-wallet today; **builder-fee revenue** on every order (the DreamDEX SDK supports it natively). |
| **Presentation (15%)** | Clean captions, no dead air, one clear story. This guide is built for that. |

**The one line the whole video must land (put it on the end card):**
*"We productize restraint. The seatbelt is the hero."*

---

## 2. ⚠️ Before you record — verify the fresh fixes are LIVE

We just shipped a few things that change what's on screen. **Confirm them before filming**, or
you'll record the old behaviour:

- [ ] **The "snag" is gone (the patience fix).** The engine used to *die* if you started a ride
      in the split-second gap between two 15-minute windows. It now **waits** and places on the
      next window instead. So if a fresh ride shows **"Getting set · Lining up the next window…"**
      for a few minutes at the start, that's the fix working — not a bug. (Needs the Deno runner
      redeployed, same as the pot fix below.)

- [ ] **Vercel redeployed the new frontend.** After the last push, wait for Vercel's build to
      finish, open the site, then **hard-refresh** (`Ctrl+Shift+R`). Sanity check: the live
      ride screen should say **"Windows won"** (not "Round") and show a plain
      *"Each win rolls your whole pot into the next window…"* line.
- [ ] **The Deno runner redeployed the new engine (the pot fix).** Start a **fresh** ride and
      look at the pot on the first window — it must read **your stake (e.g. $50.00)**, NOT
      **~$9,900**. If it still shows ~$9,900, the runner hasn't picked up the new code yet
      (Deno deploy still pending, or KV limit). **Wait until a fresh ride shows the small,
      correct pot before recording.** This is the single most important check.
- [ ] **The frontend points at the PRODUCTION runner.** `VITE_RUNNER_URL` must be
      `https://let-it-ride.temmygabriel.deno.net` (the stable domain — no random suffix).
      Preview URLs run old code and a stale database.
- [ ] **Start a NEW ride for the demo.** The pot fix only kicks in on rides started *after* the
      new engine is live. Don't film an old ride that was created before the fix.
- [ ] **Ride wallet is funded** (it is: ~9,950 tUSDC + gas). Confirm the wallet strip shows a
      real address + non-zero balances.

**Then, one full rehearsal ride the day before** — start to finish, unattended — so you know
the timing and the click-path. Don't record the rehearsal.

**Clean the screen (Windows):**
- [ ] Turn on **Focus Assist / Do Not Disturb** so no notifications pop up.
- [ ] Fresh browser window, **hide the bookmarks bar** (`Ctrl+Shift+B`), close other tabs.
- [ ] **Zoom the browser to 110–125%** (`Ctrl` and `+`) so text stays readable when compressed.
- [ ] Nothing on screen you wouldn't want a judge to see. **Never** show the runner's private
      key or env vars — the wallet **address** is fine, the key never appears.

---

## 3. The honest timing problem (this shapes the whole edit)

A real ride uses **15-minute windows** (the shortest DreamDEX offers), and the cloud worker
advances it about every **7 minutes**. A satisfying arc — place → hold → settle → claim →
roll a couple of times → disciplined cash-out — takes **~30–45 minutes of real time.**

**So do not record one continuous take.** Instead:

1. **Run a real ride for real** (that's what makes it credible).
2. **Screen-record the key moments** — you'll cut out the 15-minute waits.
3. In editing, **hard-cut or speed-ramp** each wait down to nothing.
4. Keep the **pot value and "Windows won" counter visible across cuts** so a judge can see the
   numbers genuinely moved — that reads as *more* honest than a suspiciously instant demo.

> ⚠️ Outcomes are real ~50/50 market luck — a ride *can* lose. That's honest to show once, but
> for your hero take you want a **winning** arc that ends on the celebrated cash-out. Just
> re-run until you catch a good one — each attempt is free testnet money. Do 2–3 full runs so
> you have a winner to cut from.

---

## 4. The ride config to set (for a clean winning arc)

Type these on the Setup screen (write them on a sticky note so you set them fast on camera):

- **Asset / direction:** BTC · **▲ UP** (optimistic, reads well).
- **Window:** **15-minute** (shortest).
- **Starting stake:** **50** tUSDC (round number, easy to read on screen).
- **🎯 Cash-out target:** **150** — reachable in ~2 wins, so it ends on the triumphant
  "Cashed out on target" screen.
- **🔁 Max rounds:** **4** — a backup so it still stops cleanly even if cash-out isn't hit.
- **🧱 Stop-loss:** leave **off** (so the ride doesn't end on the sad path mid-demo).

This gives the ideal arc: **win a couple of windows → hit the cash-out target → celebrated exit.**

---

## 5. Bandicam setup (silent-recording specifics)

- **Mode:** "Screen Recording" → draw a rectangle around the browser window (or record
  fullscreen and crop later). Keep the region fixed so nothing jumps.
- **Output:** 1920×1080, **30 fps** (60 if smooth), MP4 (H.264), quality ~80.
- **Turn ON mouse-click effects.** Bandicam → *Video → Settings → Effects*: enable the
  **cursor highlight + click animation**. In a silent video this is how viewers see *where*
  you click — it matters a lot without a voice pointing things out.
- **Microphone: OFF.** No narration. (You'll add music in editing.) In Bandicam → *Video →
  Settings → Recording*, disable the mic so you don't capture room noise.
- **Watermark / 10-min limit (free Bandicam):** the free version stamps a watermark and caps
  clips at 10 minutes. That's fine here — you're recording **short segments** anyway (you cut
  the waits). Record each beat as its own clip under 10 min. *(If the watermark bothers you for
  a submission, OBS Studio is free with no watermark — but Bandicam segments work.)*
- Hide Bandicam's own FPS overlay so it isn't in frame.

---

## 6. The silent flow — shot list + exact caption cards

Seven quick beats. **Times are the final edited durations**, not how long they take to film.
The **caption cards** are full-screen or lower-third text you add in editing (CapCut,
Clipchamp, or DaVinci — all free). Type them verbatim; they're your narration.

| # | Beat | ~Time | On screen | Caption card to overlay |
|---|---|---|---|---|
| 0 | **Title** | 0:00–0:05 | Black card / app header | **LET IT RIDE** · "Bet once. Let a winning streak ride itself — with a built-in seatbelt." · *Somnia × DreamDEX Event Contracts* |
| 1 | **The paradox** | 0:05–0:14 | Black card (or landing) | "Betting your whole pot on coin-flips has one ending: **zero**." → "So we didn't build the gamble. **We built the seatbelt.**" |
| 2 | **Set the bet + seatbelt** | 0:14–0:45 | Setup screen: pick BTC ▲ UP, 15-min, stake 50; then set 🎯 150 + 🔁 4 | "1 · Pick your bet" … "2 · Set how it **ends** — before it starts" … "You can't ride without a seatbelt." |
| 3 | **The plan** | 0:45–0:55 | Pause on the "The plan" sentence the app generates | *(let the app's own plain-English plan be read — no caption needed, just hold 4s)* |
| 4 | **Buckle up & ride** | 0:55–1:20 | Hit **Buckle up & ride** → live screen: phase readout, pot, the "how this moves" line, guardrail chips | "3 · Buckle up." … "Real Event Contracts, settling on-chain. No leverage — most you can lose is your stake." |
| 5 | **The money shot** | 1:20–1:45 | **Close the browser tab.** Caption card. Reopen the URL → it resumes the same ride, advanced | "4 · Close the tab. Walk away." → "⏱ A cloud worker keeps riding…" → "It kept going without me — the pot moved, a window won." *(cursor points at pot + "Windows won")* |
| 6 | **The disciplined exit** | 1:45–2:00 | Summary screen: "🎯 Cashed out on target", the plain recap line, the stats | "5 · It stops itself — exactly where I set it." *(hold on the recap line 4s so it's read)* |
| 7 | **Share + close** | 2:00–2:10 | Click "↗ Share this result" → the public share card; then end card | "Every result is shareable." → End card: **"We productize restraint. The seatbelt is the hero."** + your live URL |

### The money shot, mechanically (beat 5 — your highest-scoring 20 seconds)
The ride does **not** run in your browser — a Deno cron worker places every bet and rolls
every win server-side. So:
1. On the live screen, **close the whole browser tab** on camera (make it obvious).
2. Cut. In real life, wait ~15–20 min (a window settles + the worker rolls).
3. **Reopen the site URL.** The app auto-detects the ride still in flight and drops you back
   into it — now a window further, bigger pot, "Windows won" ticked up.
4. Overlay a caption making the point: *"I could throw this laptop in a lake — the ride keeps going."*
5. Anchor the proof: keep the **pot number and Windows-won visible** right before the cut and
   right after, so the change is undeniable.

---

## 7. Editing tips that make a silent video look pro

- **Let the app's text breathe.** The plan sentence, the "how this moves" line, the summary
  recap — **hold on each for ~4 seconds** so a muted viewer can actually read them. This is
  why the copy was rewritten in plain English: on-screen text is your voice now.
- **Caption cards: big, short, high-contrast.** 4–8 words max. One idea per card. Center them.
- **Cut every wait to zero.** Each 15-minute gap becomes a hard cut or a 1-second speed-ramp.
  Never make a judge wait.
- **Keep an anchor across cuts** — the pot value or "Windows won" — so the numbers are trusted.
- **Zoom in on two things:** the **seatbelt section** in beat 2, and the **"Cashed out on
  target"** headline in beat 6. Those are the thesis — make them fill the frame.
- **One music track**, low volume, upbeat but calm (royalty-free: YouTube Audio Library,
  Pixabay). Silent-with-music beats silent-silent.
- **A visible clock helps the money shot** — glance at a phone clock before/after the cut, or
  let the ride's "updated" time show, to prove real time passed.
- **End on the tagline as a still** for 2 seconds so it's the last thing they read.

---

## 8. Do / Don't

**Do**
- Keep it **under ~2 minutes**. Silent = tighter.
- Lead with the paradox card — your most memorable 10 seconds.
- Show **real** on-chain data (real address, real balance, real Windows-won change).
- Rehearse the click-path once so you don't fumble on camera.
- Verify the **fresh fixes are live** (§2) — small correct pot, "Windows won" label.

**Don't**
- Don't fake the loop with a mockup — the whole edge is that it's genuinely unattended.
- Don't show the private key, seed phrase, or the runner's env vars *anywhere*. (Address = fine.)
- Don't leave the buggy **~$9,900 pot** on screen — that means the runner hasn't redeployed yet.
- Don't cram tech-stack details on screen — judges read the README. Sell the *story*.
- Don't click the 🎢 logo mid-ride unless you mean to (it jumps back to Setup; just reopen/refresh to return to the live ride).

---

## 9. Export & submit

- Export **1080p, MP4, 30–60 fps**.
- Upload **unlisted on YouTube** (best for embedding, no size cap) or Loom.
- Put the link at the **top of the README** and in the submission form.
- Keep a local copy of the final file as backup.

---

### TL;DR
Silent + Bandicam. First **verify the fresh fixes are live** (pot shows ~$50, not ~$9,900;
label says "Windows won"). Run a real ride with the winning config (stake 50, cash-out 150,
max rounds 4), record the key moments in short clips, then cut to seven beats:
**title → paradox → set the seatbelt → the plan → ride → close-the-tab-and-it-kept-going →
disciplined cash-out → share.** Let the app's plain-English text sit on screen long enough to
read, add short caption cards as your voice, one calm music track, keep it under two minutes,
and end on *"we productize restraint; the seatbelt is the hero."*
