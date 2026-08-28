// Presentation helpers — turn engine data into the words and looks the UI shows.
// All copy lives here so the voice stays consistent: calm, honest, celebrates
// the disciplined exit as the win (never a casino).

import type { Asset, Direction, IntervalSec, RidePhase, StopReason } from "../src/types.ts";

/** A ride is over once it reaches one of these phases (mirrors the engine). */
export function isTerminalPhase(phase: RidePhase): boolean {
  return phase === "STOPPED" || phase === "ERROR";
}

/** The query the share page reads back. Kept tiny so the link stays short. */
export interface ShareParams {
  asset: Asset;
  dir: Direction;
  round: number;
  start: number;
  pot: number;
  /** "riding" while live; the lowercased StopReason (or "error") once ended. */
  status: string;
}

/** Build an absolute /share link that renders a public card of this ride. */
export function buildShareUrl(p: ShareParams): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const q = new URLSearchParams({
    asset: p.asset,
    dir: p.dir,
    round: String(p.round),
    start: String(p.start),
    pot: String(p.pot),
    status: p.status,
  });
  return `${origin}/share?${q.toString()}`;
}

/** Money-ish formatting for the pot (tUSDC, shown with a $ for feel). */
export function money(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact token balance (e.g. wallet strip). */
export function tokenAmount(raw: string, maxFrac = 2): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

/** 0x1234…abcd */
export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function assetLabel(asset: Asset): string {
  return asset === "BTC" ? "Bitcoin" : "Ethereum";
}

export function intervalLabel(sec: IntervalSec): string {
  return sec === 900 ? "15-minute" : "1-hour";
}

export interface DirectionLook {
  arrow: string;
  word: string;
  tone: "up" | "down";
}

export function directionLook(direction: Direction): DirectionLook {
  return direction === "UP"
    ? { arrow: "▲", word: "UP", tone: "up" }
    : { arrow: "▼", word: "DOWN", tone: "down" };
}

export interface PhaseLook {
  label: string;
  hint: string;
  busy: boolean;
}

/** Friendly, plain-language phase readout for the live screen. */
export function phaseLook(phase: RidePhase): PhaseLook {
  switch (phase) {
    case "IDLE":
      return { label: "Getting set", hint: "Lining up the next window…", busy: true };
    case "PLACING":
      return { label: "Placing your bet", hint: "Sending the order on-chain…", busy: true };
    case "HOLDING":
      return { label: "Riding this window", hint: "In a position — waiting for it to settle.", busy: true };
    case "CLAIMING":
      return { label: "You won this window! 🎉", hint: "Collecting your winnings from the chain…", busy: true };
    case "ROLLING":
      return { label: "Letting it ride", hint: "Rolling your bigger pot into the next window — automatically.", busy: true };
    case "STOPPED":
      return { label: "Ride complete", hint: "", busy: false };
    case "ERROR":
      return { label: "Hit a snag", hint: "", busy: false };
  }
}

export interface OutcomeLook {
  emoji: string;
  headline: string;
  blurb: string;
  tone: "win" | "safe" | "neutral" | "loss";
}

/** How the summary screen frames each ending. Disciplined exits are the win. */
export function outcomeLook(reason: StopReason | undefined): OutcomeLook {
  switch (reason) {
    case "CASH_OUT_TARGET":
      return {
        emoji: "🎯",
        headline: "Cashed out on target",
        blurb: "Your auto cash-out did exactly its job. You walked away a winner — no second-guessing.",
        tone: "win",
      };
    case "MAX_ROUNDS":
      return {
        emoji: "🛡️",
        headline: "Hit your round limit",
        blurb: "You capped the ride in advance, and it stopped right where you said. That's discipline.",
        tone: "safe",
      };
    case "STOP_LOSS":
      return {
        emoji: "🧱",
        headline: "Stop-loss held the floor",
        blurb: "Things turned, and your floor caught it — exactly what a seatbelt is for.",
        tone: "safe",
      };
    case "USER_STOP":
      return {
        emoji: "✋",
        headline: "You stopped the ride",
        blurb: "Banked the current window and stepped out. Your call, honoured.",
        tone: "neutral",
      };
    case "VOID_EXIT":
      return {
        emoji: "↩️",
        headline: "Window voided",
        blurb: "The window didn't produce a result. We took the refund and stepped out cleanly.",
        tone: "neutral",
      };
    case "LOST":
      return {
        emoji: "💥",
        headline: "That window didn't land",
        blurb: "The last window went the other way, so the ride ends here. You never risked more than you loaded in.",
        tone: "loss",
      };
    default:
      return {
        emoji: "🏁",
        headline: "Ride ended",
        blurb: "",
        tone: "neutral",
      };
  }
}
