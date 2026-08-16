"use client";

import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { Check, KeyRound, Loader2, Lock, ShieldAlert, X } from "lucide-react";
import { chatFetch } from "@/lib/chat-api";
import { createRecoveryBackup, ensureChatIdentity, storeRecoveredIdentity } from "@/lib/chat-crypto";
import { isValidRecoveryPin, RECOVERY_PIN_MAX_LENGTH, RECOVERY_PIN_MIN_LENGTH } from "@/lib/chat-recovery-shared";

export default function ChatRecoveryModal({
  user,
  mode,
  onClose,
  onRestored,
}: {
  user: FirebaseUser;
  mode: "setup" | "restore";
  onClose: () => void;
  onRestored?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [restored, setRestored] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(mode === "restore");
  const [restoreLocked, setRestoreLocked] = useState(false);
  const [restoreUnavailable, setRestoreUnavailable] = useState(false);

  useEffect(() => {
    if (mode !== "restore") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await chatFetch(user, "/api/chat/recovery", { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.available) setRestoreUnavailable(true);
        else if (data.locked) setRestoreLocked(true);
      } catch {
        // Leave the form usable — the restore call itself will report any error.
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, user]);

  const setupPin = async () => {
    const normalized = pin.replace(/\D/g, "");
    if (!isValidRecoveryPin(normalized)) {
      setError(`Use ${RECOVERY_PIN_MIN_LENGTH}–${RECOVERY_PIN_MAX_LENGTH} digits.`);
      return;
    }
    if (normalized !== confirmPin.replace(/\D/g, "")) {
      setError("Those PINs don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const backup = await createRecoveryBackup(user.uid, normalized);
      const response = await chatFetch(user, "/api/chat/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      if (!response.ok) throw new Error("Could not save your recovery PIN");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not set up recovery");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await chatFetch(user, "/api/chat/recovery/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: input.replace(/\D/g, "") }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 423) setRestoreLocked(true);
        throw new Error(data.error || "Unable to restore this device");
      }
      storeRecoveredIdentity(user.uid, data.identity);
      const keyResponse = await chatFetch(user, "/api/chat/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: data.identity.publicKey }),
      });
      if (!keyResponse.ok) throw new Error("The recovered key could not be registered");
      setRestored(true);
      onRestored?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore this device");
    } finally {
      setBusy(false);
    }
  };

  const pinDigits = input.replace(/\D/g, "");

  const startFresh = async () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const identity = await ensureChatIdentity(user.uid);
      const keyResponse = await chatFetch(user, "/api/chat/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: identity.publicKey, confirmReset: true }),
      });
      if (!keyResponse.ok) throw new Error("Could not reset your encrypted chat identity");
      setRestored(true);
      onRestored?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset encrypted chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-end justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="modal-solid w-full max-w-md rounded-3xl border border-line-strong p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{mode === "setup" ? "Set a recovery PIN" : "Restore with your PIN"}</h2>
            <p className="mt-1 text-sm leading-5 text-white/55">
              {mode === "setup"
                ? "If you ever lose access to every linked device, this PIN is the only way back into your encrypted chats."
                : "Enter the PIN you chose when encryption was first set up on this account."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/50 hover:bg-white/[0.07] hover:text-white" aria-label="Close chat recovery">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        {mode === "setup" && !saved && (
          <div className="mt-5 space-y-3">
            <div>
              <label htmlFor="chat-recovery-pin" className="text-xs font-semibold uppercase tracking-wide text-white/40">Choose a PIN</label>
              <input
                id="chat-recovery-pin"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, RECOVERY_PIN_MAX_LENGTH))}
                placeholder="6+ digits"
                inputMode="numeric"
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-elevated px-4 py-3 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-brand-green/60"
              />
            </div>
            <div>
              <label htmlFor="chat-recovery-pin-confirm" className="text-xs font-semibold uppercase tracking-wide text-white/40">Confirm PIN</label>
              <input
                id="chat-recovery-pin-confirm"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, RECOVERY_PIN_MAX_LENGTH))}
                placeholder="Type it again"
                inputMode="numeric"
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-elevated px-4 py-3 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-brand-green/60"
              />
            </div>
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Don&apos;t reuse a PIN from another account. MindFuel cannot see or reset this PIN. After 5 wrong attempts on a new device, this backup locks and you&apos;ll need a trusted linked device instead.</span>
            </div>
            <button
              type="button"
              onClick={setupPin}
              disabled={busy || pin.length < RECOVERY_PIN_MIN_LENGTH || confirmPin.length < RECOVERY_PIN_MIN_LENGTH}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Save PIN
            </button>
          </div>
        )}

        {mode === "setup" && saved && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4 text-brand-green">
            <Check className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Recovery PIN saved</p>
              <p className="mt-0.5 text-xs text-white/55">Remember it — MindFuel can&apos;t look it up or reset it for you.</p>
            </div>
          </div>
        )}

        {mode === "restore" && !restored && checkingStatus && (
          <div className="mt-5 flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          </div>
        )}

        {mode === "restore" && !restored && !checkingStatus && restoreUnavailable && (
          <div className="mt-5 rounded-2xl border border-line-strong bg-surface-elevated p-3 text-sm text-white/70">
            No recovery PIN has been set up for this account. Link a trusted device instead, or start fresh below.
          </div>
        )}

        {mode === "restore" && !restored && !checkingStatus && !restoreUnavailable && restoreLocked && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This backup is locked after too many incorrect attempts. Link a trusted device instead, or set up a new PIN from one.</span>
          </div>
        )}

        {mode === "restore" && !restored && !checkingStatus && !restoreUnavailable && !restoreLocked && (
          <div className="mt-5">
            <label htmlFor="chat-recovery-input" className="text-xs font-semibold uppercase tracking-wide text-white/40">Recovery PIN</label>
            <input
              id="chat-recovery-input"
              value={input}
              onChange={(event) => setInput(event.target.value.replace(/\D/g, "").slice(0, RECOVERY_PIN_MAX_LENGTH))}
              placeholder="Enter your PIN"
              inputMode="numeric"
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-elevated px-4 py-3 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-brand-green/60"
            />
            <button
              type="button"
              onClick={restore}
              disabled={busy || pinDigits.length < RECOVERY_PIN_MIN_LENGTH}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Restore access
            </button>
          </div>
        )}

        {mode === "restore" && !restored && !checkingStatus && (
          <div className="mt-5 border-t border-line-subtle pt-4">
            {!confirmingReset ? (
              <button type="button" onClick={startFresh} className="w-full text-center text-xs text-white/45 underline underline-offset-2 hover:text-white/70">
                I don&apos;t have my PIN or another device
              </button>
            ) : (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
                <p className="text-xs leading-5 text-red-200">
                  Starting fresh permanently gives up this device&apos;s access to every previous encrypted conversation on this account. New messages will work again immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirmingReset(false)} className="flex-1 rounded-full border border-line-strong px-3 py-2 text-xs font-semibold text-white/70">
                    Cancel
                  </button>
                  <button type="button" onClick={startFresh} disabled={busy} className="flex-1 rounded-full bg-red-500/90 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Start fresh"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {restored && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4 text-brand-green">
            <Check className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Access restored</p>
              <p className="mt-0.5 text-xs text-white/55">This device can now read and send encrypted messages.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
