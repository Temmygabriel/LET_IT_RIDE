# Somnia × DreamDEX Event Contracts Hackathon — Research & Ideation Brief

## Your job in this session

Don't propose an idea yet. Research first, then generate, then stress-test. Work through the phases below in order and show your work at each step — I want to see what you found before you tell me what to build.

The prize pool is small ($5,000) but the real prize is visibility: social spotlight, Discord showcase, and a shot at continued development. That changes what "winning" means here — a polished, narrow, genuinely useful tool beats a broad half-working demo.

---

## Hackathon details (verbatim from organizers)

**Event:** Somnia × DreamDEX Event Contracts Hackathon
**Host:** Somnia (high-performance EVM-compatible L1), in collaboration with DreamDEX

**Timeline:**
- Registration opened: Aug 18
- Submission window: Aug 25 – Sep 8
- Today's date: Aug 21 — so we're pre-submission-open, which means there's still time to shape scope properly instead of rushing.

**Prize pool:** $5,000 USDso, plus non-cash upside: social media spotlight, showcase to the Somnia community, featured placement in the Somnia Discord showcase series.

**What they're asking for:**
> Build the next generation of prediction market experiences on DreamDEX. Consumer-facing trading applications, AI-powered trading agents, analytics tools, social prediction products, or entirely new experiences that showcase what can be built with DreamDEX Event Contracts.

**Who they're targeting:** AI/AI-agent web3 devs, trading application developers, full-stack devs, product-focused builders, prediction-market/on-chain-trading enthusiasts. Individual or team.

**Explicit steer from organizers:** *"We encourage experienced builders to create production-ready applications rather than simple proof-of-concept."* — this is a real signal. A rough demo that technically works will lose to something that feels finished, even if the finished thing is scoped smaller.

**What a submission should demonstrate:**
- A working prototype
- Integration with DreamDEX Event Contracts
- Meaningful use of DreamDEX APIs and/or SDKs
- A clear and intuitive user experience
- Potential for user adoption, trading activity, or ecosystem impact

**Required submission materials:**
- Working prototype on testnet
- GitHub repository
- 2–3 minute demo video
- Feedback report on the SDK and documentation (this is a real deliverable, not filler — treat it seriously, they'll notice if it's thoughtful)
- Optional: presentation deck

**Judging weights:**
| Criterion | Weight |
|---|---|
| Innovation & Originality | 20% |
| Technical Implementation | 25% |
| User Experience & Design | 20% |
| Business & Ecosystem Impact | 20% |
| Presentation & Demo | 15% |

Note Technical Implementation is the single biggest line item at 25%. UX and Business Impact are tied at 20% each. Innovation is only 20% — meaning a merely clever idea executed poorly loses to a familiar idea executed exceptionally well. Weight your effort accordingly: this leans toward "build it properly" over "have the wildest idea."

**Developer resources:**
- DreamDEX Bot Kit: https://github.com/somnia-chain/dreamdex-bot-kit
- DreamDEX Bot Builder: https://dreambot-builder.vercel.app/
- Full docs: https://docs.dreamdex.io/developers/event-contracts
- Dev community (Telegram): https://t.me/+XHq0F0JXMyhmMzM0
- Testnet STT tokens available via the Telegram group

**About the platform:** Somnia is an EVM-compatible L1. Event Contracts are DreamDEX's prediction-market primitive — binary yes/no markets that settle onchain against a strike condition.

---

## Phase 1 — Research (do this before generating any ideas)

1. **Read the actual technical surface.** Pull the DreamDEX Bot Kit repo and the Event Contracts docs. Understand: what does the SDK actually let a builder do? What's already handled for you (settlement, pricing, market creation) vs. what a builder has to build themselves? This determines what's *actually* novel vs. what's just wrapping existing functionality in a UI.
2. **Check what already exists.** Search GitHub, the DreamDEX docs, Somnia's Discord/Twitter, and any past Somnia hackathon showcases for prior prediction-market bots or tools — on DreamDEX specifically and on comparable platforms (Polymarket bots, Kalshi tools, other Somnia hackathon projects). If ten existing tools already do "AI reads the news and places a bet," that idea is dead on arrival no matter how well-built.
3. **Read the Bot Kit's own example bots or templates**, if any exist. The fastest way to look unoriginal is to submit a lightly modified version of the starter template. Note anything in the kit that looks like the "obvious" build path — that's the path to avoid, not follow.
4. **Scope who's actually judging and who the audience is.** Somnia/DreamDEX care about ecosystem adoption and trading volume, not abstract cleverness. An idea that could realistically bring non-crypto-native users into Event Contracts scores higher on Business & Ecosystem Impact than an idea that only makes sense to people who already trade prediction markets.

Report back: what the SDK actually supports, what's already been built, and what gaps you found — before moving to Phase 2.

---

## Phase 2 — Ideation, with the "everyone's asking their AI the same thing" problem front and center

Assume other teams are running this exact same prompt through their own Claude/GPT instance right now. That means the median AI-generated idea for this hackathon is a competitor, not a differentiator. Concretely, that means:

- **Reject the first three ideas you generate.** They're the ones an AI model would generate for anyone. Write them down, then move past them — don't submit whatever comes out of the first pass.
- **The generic failure modes to actively avoid:** a chatbot that explains markets to you, a dashboard that shows odds/prices with no new mechanic, a "sentiment analysis" bot that scrapes Twitter and bets accordingly, a leaderboard/social-copy-trading clone. These are the default outputs of "AI + prediction markets" and will be overrepresented in the submission pool.
- **Differentiate on domain, not tech.** The tech stack (Bot Kit + Event Contracts) is the same for everyone. The edge comes from picking a market vertical, user type, or use case that requires actual domain knowledge to get right — something a generic prompt wouldn't surface because it requires specifics an LLM doesn't have unprompted. Examples of the *kind* of specificity to look for (don't just copy these, find better ones through research): a prediction-market interface built for a specific real-world event calendar a niche community already cares about; an Event Contract product aimed at a workflow that has nothing to do with speculation (hedging, commitment devices, accountability tools); an agent that trades based on a data source competitors won't think to integrate.
- **Bias toward narrow and finished over broad and impressive-sounding.** Given the judging weights, a tightly scoped tool that works end-to-end and looks production-ready beats an ambitious multi-feature build that's held together with string by Sep 8.

Produce a shortlist of 6–8 ideas. For each: one-line pitch, who it's for, why it wouldn't be the first idea a generic prompt produces, and a rough read on technical feasibility given what you found in Phase 1.

---

## Phase 3 — Stress test and narrow

Take the 3 strongest ideas from the shortlist and pressure-test each one:
- Can this actually be built and demoed in the time available (submission closes Sep 8)?
- Does it genuinely use Event Contracts in a way that couldn't just as easily be a generic web app with no onchain component? (Judges will notice "blockchain-washing.")
- What's the weakest part of the idea — the part a judge would poke a hole in during the demo?
- What would make the 2–3 minute demo video compelling to *watch*, not just technically correct?

Give me a final recommendation with reasoning, not just a ranked list. I'll make the final call, but I want your actual opinion on which one gives the best combination of feasibility, originality, and judging-criteria fit.
