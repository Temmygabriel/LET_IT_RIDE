// The public share card at /share?asset&dir&round&start&pot&status.
//
// Deliberately standalone: it reads everything from the URL and talks to no
// runner, so a shared link renders for anyone — no wallet, no ride, no backend.
// App.tsx routes here before any ride hooks run.

import { useEffect } from "react";
import type { Asset, Direction } from "../../src/types.ts";
import { directionLook, money } from "../format.ts";

interface Shared {
  asset: Asset;
  dir: Direction;
  round: number;
  start: number;
  pot: number;
  status: string;
}

/** Read + sanity-check the query. Bad/absent values fall back to something sane. */
function readParams(): Shared {
  const q = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const num = (k: string, dflt: number) => {
    const n = Number(q.get(k));
    return Number.isFinite(n) ? n : dflt;
  };
  const asset: Asset = q.get("asset") === "ETH" ? "ETH" : "BTC";
  const dir: Direction = q.get("dir") === "DOWN" ? "DOWN" : "UP";
  return {
    asset,
    dir,
    round: Math.max(0, Math.floor(num("round", 0))),
    start: num("start", 0),
    pot: num("pot", 0),
    status: (q.get("status") ?? "riding").toLowerCase(),
  };
}

interface StatusLook {
  emoji: string;
  headline: string;
}

/** Map the status token to a headline. Mirrors the app's honest, calm voice. */
function statusLook(status: string): StatusLook {
  switch (status) {
    case "riding":
      return { emoji: "🎢", headline: "Riding live" };
    case "cash_out_target":
      return { emoji: "🎯", headline: "Cashed out on target" };
    case "max_rounds":
      return { emoji: "🛡️", headline: "Hit the round cap" };
    case "stop_loss":
      return { emoji: "🧱", headline: "Stop-loss held the floor" };
    case "user_stop":
      return { emoji: "✋", headline: "Stopped on their own call" };
    case "void_exit":
      return { emoji: "↩️", headline: "Window voided — stepped out clean" };
    case "lost":
      return { emoji: "💥", headline: "Ride ended" };
    case "error":
      return { emoji: "🔧", headline: "Ride hit a snag" };
    default:
      return { emoji: "🏁", headline: "Ride recap" };
  }
}

/** Upsert a meta tag by property/name so social crawlers get a title + blurb. */
function setMeta(attr: "property" | "name", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function ShareCard() {
  const p = readParams();
  const dir = directionLook(p.dir);
  const look = statusLook(p.status);
  const net = p.pot - p.start;
  const up = net >= 0;
  const mult = p.start > 0 ? p.pot / p.start : 0;

  const title = `${look.emoji} ${look.headline} — ${p.asset} ${dir.word}`;
  const desc =
    p.status === "riding"
      ? `Riding ${money(p.pot)} on ${p.asset} ${dir.word} (from ${money(p.start)}). Auto cash-out and stop-loss are on the whole time.`
      : `${money(p.start)} rode ${p.round} auto-rolled window${p.round === 1 ? "" : "s"} on ${p.asset} ${dir.word}, then stopped itself at a preset limit. Discipline is the win.`;

  // Give crawlers (and the tab) a per-ride title + blurb.
  useEffect(() => {
    document.title = `${title} · Let It Ride`;
    setMeta("property", "og:title", `${title} · Let It Ride`);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", `${title} · Let It Ride`);
    setMeta("name", "twitter:description", desc);
  }, [title, desc]);

  return (
    <div className="share-wrap">
      <div className="card share-card">
        <div className="brand share-brand">
          <span className="brand-mark">🎢</span>
          <span className="brand-name">Let It Ride</span>
        </div>

        <p className="share-tagline muted small">
          A hands-off way to bet crypto up or down — with a seatbelt that decides when to walk away.
        </p>

        <div className={`dir-badge ${dir.tone}`}>
          <span className="dir-arrow">{dir.arrow}</span>
          <span>
            {p.asset} {dir.word}
          </span>
        </div>

        <div className="share-status">
          {look.emoji} {look.headline}
        </div>

        <div className="pot">
          <div className="pot-label">{p.status === "riding" ? "Pot riding" : "Final pot"}</div>
          <div className="pot-value">{money(p.pot)}</div>
          <div className={`pot-delta ${up ? "up" : "down"}`}>
            {up ? "▲" : "▼"} {money(Math.abs(net))} {up ? "up" : "down"} from {money(p.start)}
            {mult > 0 && <> · {mult.toFixed(mult >= 10 ? 0 : 1)}×</>}
          </div>
        </div>

        <p className="share-sub muted">
          {p.status === "riding"
            ? `Winnings roll into each new ${p.asset} window on their own — and stop the moment a limit is hit.`
            : `Rolled across ${p.round} ${p.asset} window${p.round === 1 ? "" : "s"} on its own, then stopped itself at a limit set before the first bet.`}
        </p>

        <a className="btn btn-primary btn-big" href="/">
          Start your own ride →
        </a>
      </div>

      <p className="tiny muted share-foot">
        Let It Ride productizes restraint — auto cash-out and stop-loss are always on. Testnet only.
      </p>
    </div>
  );
}
