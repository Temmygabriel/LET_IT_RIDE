// The roll engine — the heart of Let It Ride.
//
// A ride is a little state machine: find the current window → size the bet →
// place it → wait for the window to settle → claim the winnings → check the
// seatbelts → roll the whole pot into the next window, and repeat until a
// guardrail (or the user) says stop.
//
// Portable on purpose: no node:fs, no dotenv, no process.env, no framework —
// just the SDK, our pure rules, and setTimeout. So the exact same engine runs
// in a browser tab, in a Cloudflare Worker cron, or in Node.
//
// Two ways to drive it:
//   • step()  — advance the machine by ONE beat and return. This is what a
//               Worker cron calls each tick; it never blocks waiting.
//   • run()   — loop step() with a polling delay until the ride ends. This is
//               the convenient "just run it" path for a browser/session.

import { ORDER_TYPE, fromHuman, toHuman } from "@somnia-chain/markets-sdk";
import type {
  SomniaMarkets,
  BinaryStakeQuote,
  MarketOnchain,
} from "@somnia-chain/markets-sdk";
import type { Address, Hex } from "viem";

import { ADDRESSES } from "./config";
import type { RideConfig, RideState } from "./types";
import {
  buySideForDirection,
  didWin,
  nextStake,
  evaluateGuardrails,
} from "./rules";

// tUSDC has 6 decimals; we learn the market's real quote decimals from chain on
// the first lookup and cache it, but start from the demo's known default so a
// conversion before that first read is still correct.
const DEFAULT_DECIMALS = 6;

/** Unix seconds — the clock unit RideState uses. */
function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** A ride is over once it reaches one of these two phases. */
function isTerminal(state: RideState): boolean {
  return state.phase === "STOPPED" || state.phase === "ERROR";
}

/** Portable sleep (browser, Worker, and Node all have setTimeout). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RunOptions {
  /** How long to wait between checks while HOLDING a position (ms). Default 5s. */
  pollMs?: number;
  /** Safety cap on how many beats run() will take before returning. Default 10000. */
  maxTicks?: number;
}

/**
 * One live ride. Construct it with a connected exchange (a signer must already
 * be attached via `attachRideWallet` — placing and claiming need to sign) and
 * the ride's config, then drive it with step() or run().
 */
export class RideEngine {
  readonly state: RideState;
  private readonly exchange: SomniaMarkets;
  /** Quote decimals of the collateral, learned from chain and cached. */
  private decimals = DEFAULT_DECIMALS;
  /** Set by requestStop(): finish the current window, then halt instead of rolling. */
  private stopRequested = false;

  constructor(exchange: SomniaMarkets, config: RideConfig) {
    this.exchange = exchange;
    this.state = {
      config,
      phase: "IDLE",
      round: 0,
      pot: config.startStake,
      currentMarketId: null,
      startedAt: nowSec(),
      updatedAt: nowSec(),
    };
  }

  /**
   * Ask the ride to stop cleanly. We can't un-bet a position that's already
   * placed, so if we're mid-window the ride banks that window first and then
   * halts (USER_STOP) instead of rolling into the next one.
   */
  requestStop(): void {
    this.stopRequested = true;
  }

  /**
   * Advance the machine by exactly one beat and return the new state. Safe to
   * call once per Worker cron tick. Never throws: any failure lands the ride in
   * the ERROR phase with a message, so the caller can inspect and decide.
   */
  async step(): Promise<RideState> {
    try {
      switch (this.state.phase) {
        case "IDLE":
          await this.beatIdle();
          break;
        case "HOLDING":
          await this.beatHolding();
          break;
        case "CLAIMING":
          await this.beatClaiming();
          break;
        case "ROLLING":
          this.beatRolling();
          break;
        // PLACING is transient (it only exists mid-beatIdle); STOPPED and ERROR
        // are terminal. Nothing to do for any of them.
        default:
          break;
      }
    } catch (err) {
      this.fail(err);
    }
    return this.state;
  }

  /**
   * Drive the ride to completion: loop step(), sleeping only while we're
   * waiting for a window to settle. Returns the final state (STOPPED or ERROR).
   */
  async run(opts: RunOptions = {}): Promise<RideState> {
    const pollMs = opts.pollMs ?? 5000;
    const maxTicks = opts.maxTicks ?? 10000;

    for (let tick = 0; tick < maxTicks; tick++) {
      if (isTerminal(this.state)) break;
      await this.step();
      if (isTerminal(this.state)) break;
      // Only HOLDING is a genuine "wait" — the window hasn't settled yet. Every
      // other phase has real work queued, so loop straight into it.
      if (this.state.phase === "HOLDING") await sleep(pollMs);
    }
    return this.state;
  }

  // --- Phase beats -------------------------------------------------------

  /**
   * IDLE: about to start a round. Check the seatbelts FIRST (this is where a
   * banked win or a hit round-cap ends the ride), then find the current window,
   * size the bet, and place it.
   */
  private async beatIdle(): Promise<void> {
    // A pending Stop wins over starting another round.
    if (this.stopRequested) {
      this.finish("USER_STOP");
      return;
    }

    // Seatbelts, evaluated against the pot we're about to stake and the number
    // of windows already ridden.
    const stop = evaluateGuardrails(
      this.state.config.guardrails,
      this.state.pot,
      this.state.round,
    );
    if (stop) {
      this.finish(stop);
      return;
    }

    const wallet = this.requireWallet();
    const client = this.exchange.client;
    const { asset, direction, intervalSec, operatorId } = this.state.config;

    // Find the current window: live markets come back soonest-to-expire first,
    // so we take the first one that is actually accepting orders on-chain.
    const live = await client.listLiveBinaryMarkets({
      operatorId,
      asset,
      intervalSec,
    });

    let marketId: Hex | null = null;
    let pool: Address | null = null;
    for (const m of live) {
      const oc: MarketOnchain = await client.getMarketOnchain(m.marketId);
      // Cache the real collateral decimals the first time we see them.
      this.decimals = oc.decimals;
      // status 1 === Trading is the only status that accepts orders.
      if (oc.status === 1) {
        marketId = m.marketId;
        pool = m.poolAddress;
        break;
      }
    }

    if (!marketId || !pool) {
      throw new Error(
        `no tradeable ${asset} ${intervalSec}s window on operator ${operatorId} right now`,
      );
    }

    // Size the bet: the whole pot rides (nextStake), converted to raw units.
    const stakeHuman = nextStake(this.state.pot);
    const stakeRaw = fromHuman(stakeHuman, this.decimals);
    const side = buySideForDirection(direction);

    this.touch("PLACING");

    // quoteBinaryStake needs a live book, so hold a watch just for the quote.
    const watch = await client.watchMarket(pool);
    let quote: BinaryStakeQuote | null;
    try {
      quote = await client.quoteBinaryStake({ pool, side, stake: stakeRaw });
    } finally {
      watch.stop();
    }

    if (!quote) {
      throw new Error(
        `nothing fillable for a ${stakeHuman} stake on ${asset} (empty book or stake below one lot)`,
      );
    }

    // Place a market (IOC) order at the protective limit the quote computed.
    await this.exchange.trader.placeOrder({
      pool,
      side,
      price: quote.yesPrice,
      quantity: quote.quantity,
      orderType: ORDER_TYPE.MARKET,
      builder: this.state.config.builder,
      builderFeeBpsTimes1k: this.state.config.builderFeeBpsTimes1k,
    });

    // We hold the position; wait for the window to settle. (The wallet address
    // is captured above so a later claim reads the right account.)
    void wallet;
    this.state.currentMarketId = marketId;
    this.touch("HOLDING");
  }

  /**
   * HOLDING: in a position, waiting for the window to settle. One chain read
   * tells us where the market stands; we only move when it's actually done.
   */
  private async beatHolding(): Promise<void> {
    const marketId = this.state.currentMarketId as Hex | null;
    if (!marketId) {
      throw new Error("HOLDING with no current market — lost track of the bet");
    }

    const oc: MarketOnchain = await this.exchange.client.getMarketOnchain(marketId);

    // Still running: neither resolved nor voided. Stay put; run() will sleep.
    if (!oc.isResolved && !oc.isVoided) {
      this.touch("HOLDING");
      return;
    }

    // Voided window: no winner. We'll redeem the half-back in CLAIMING, then
    // stop (a void breaks the ride). Route through CLAIMING either way.
    if (oc.isVoided) {
      this.touch("CLAIMING");
      return;
    }

    // Resolved for real: did our direction win?
    const won = didWin(this.state.config.direction, oc.winningOutcome as 0 | 1);
    if (won) {
      this.touch("CLAIMING");
      return;
    }

    // Lost: the tokens we hold are worthless. Nothing to claim; the pot is
    // whatever collateral is left in the wallet (usually dust). Ride over.
    await this.refreshPotFromWallet();
    this.finish("LOST");
  }

  /**
   * CLAIMING: the window settled in our favour (a win) or voided. Redeem every
   * claimable position, refresh the pot from the wallet, then either stop (void)
   * or roll (win). We re-read the chain here rather than remembering a flag, so
   * a Worker that only persists RideState can resume mid-ride correctly.
   */
  private async beatClaiming(): Promise<void> {
    const wallet = this.requireWallet();
    const client = this.exchange.client;
    const marketId = this.state.currentMarketId as Hex | null;

    const claimable = await client.getClaimable(wallet);
    if (claimable.length > 0) {
      await this.exchange.trader.redeemMany({
        entries: claimable.map((c) => ({
          marketId: c.marketId as Hex,
          outcomeIdx: c.outcomeIdx,
          amount: c.amount,
        })),
      });
    }

    // The wallet's collateral balance IS the new pot — chain truth, no drift.
    await this.refreshPotFromWallet();

    // A voided window ends the ride (we took the half-back and step out).
    if (marketId) {
      const oc: MarketOnchain = await client.getMarketOnchain(marketId);
      if (oc.isVoided) {
        this.finish("VOID_EXIT");
        return;
      }
    }

    this.touch("ROLLING");
  }

  /**
   * ROLLING: a window was won and claimed. Count it, clear the old market, and
   * go back to IDLE — which will re-check the seatbelts and place the next bet.
   */
  private beatRolling(): void {
    this.state.round += 1;
    this.state.currentMarketId = null;
    // If the user asked to stop while we were finishing the window, honour it
    // now instead of starting another round.
    if (this.stopRequested) {
      this.finish("USER_STOP");
      return;
    }
    this.touch("IDLE");
  }

  // --- Helpers -----------------------------------------------------------

  /** The ride wallet address, or a clear error if no signer is attached. */
  private requireWallet(): `0x${string}` {
    const addr = this.exchange.walletAddress;
    if (!addr) {
      throw new Error("no ride wallet attached — call attachRideWallet first");
    }
    return addr;
  }

  /** Set the pot to the wallet's current collateral balance, in human units. */
  private async refreshPotFromWallet(): Promise<void> {
    const wallet = this.requireWallet();
    const collateral = ADDRESSES.collateral;
    if (!collateral) {
      throw new Error("no collateral address configured");
    }
    const raw = await this.exchange.client.getErc20Balance(collateral, wallet);
    this.state.pot = toHuman(raw, this.decimals);
    this.state.updatedAt = nowSec();
  }

  /** Move to a phase and stamp updatedAt. */
  private touch(phase: RideState["phase"]): void {
    this.state.phase = phase;
    this.state.updatedAt = nowSec();
  }

  /** End the ride cleanly with a reason. */
  private finish(reason: RideState["stopReason"]): void {
    this.state.stopReason = reason;
    this.state.phase = "STOPPED";
    this.state.updatedAt = nowSec();
  }

  /** Land the ride in ERROR with a readable message. */
  private fail(err: unknown): void {
    this.state.lastError = err instanceof Error ? err.message : String(err);
    this.state.phase = "ERROR";
    this.state.updatedAt = nowSec();
  }
}
