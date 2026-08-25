import { useCallback, useEffect, useState } from "react";
import {
  getWallet,
  mintFaucet,
  RUNNER_CONFIGURED,
  type WalletInfo,
} from "../api.ts";
import { shortAddress, tokenAmount } from "../format.ts";

/**
 * Always-visible strip: the ride wallet's address + balances, a refresh, and a
 * faucet button to mint testnet tUSDC. The address is public and safe to show;
 * the private key never leaves the runner's environment.
 */
export function WalletStrip() {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInfo(await getWallet());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (RUNNER_CONFIGURED) void refresh();
  }, [refresh]);

  const faucet = async () => {
    setBusy(true);
    try {
      await mintFaucet();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className="wallet-strip">
      <div className="wallet-left">
        <span className="wallet-label">Ride wallet</span>
        {info ? (
          <button className="wallet-addr" onClick={() => void copy()} title="Copy address">
            {shortAddress(info.address)} <span className="copy-mark">{copied ? "✓" : "⧉"}</span>
          </button>
        ) : (
          <span className="wallet-addr muted">
            {RUNNER_CONFIGURED ? "connecting…" : "not connected"}
          </span>
        )}
      </div>

      <div className="wallet-balances">
        <span className="bal">
          <b>{info ? tokenAmount(info.tUsdc) : "—"}</b> tUSDC
        </span>
        <span className="bal">
          <b>{info ? tokenAmount(info.stt, 4) : "—"}</b> STT
        </span>
      </div>

      <div className="wallet-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => void refresh()}
          disabled={!RUNNER_CONFIGURED}
        >
          Refresh
        </button>
        <button
          className="btn btn-mint btn-sm"
          onClick={() => void faucet()}
          disabled={!RUNNER_CONFIGURED || busy}
        >
          {busy ? "Minting…" : "Faucet +tUSDC"}
        </button>
      </div>

      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
}
