"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { Check, Copy, KeyRound, Link2, Loader2, ShieldCheck, Smartphone, X } from "lucide-react";
import { chatFetch } from "@/lib/chat-api";
import {
  chatKeyVerification,
  encryptChatIdentityForDevice,
  ensureChatIdentity,
  installLinkedChatIdentity,
  type EncryptedChatIdentity,
} from "@/lib/chat-crypto";

type LinkSession = {
  id: string;
  status: "pending" | "requested" | "ready" | "consumed";
  targetPublicKey?: string;
  targetDeviceName?: string;
  verification?: string;
  encryptedIdentity?: EncryptedChatIdentity;
  expiresAt: string;
};

function deviceName() {
  const platform = navigator.platform || "Mobile device";
  const browser = navigator.userAgent.match(/(Chrome|CriOS|Firefox|FxiOS|Safari|EdgA|EdgiOS)\/[\d.]+/)?.[1];
  return `${platform}${browser ? ` · ${browser}` : ""}`;
}

export default function ChatDeviceLinkModal({
  user,
  mode,
  onClose,
  onLinked,
}: {
  user: FirebaseUser;
  mode: "source" | "target";
  onClose: () => void;
  onLinked: () => void;
}) {
  const [sessionId, setSessionId] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [session, setSession] = useState<LinkSession | null>(null);
  const [verification, setVerification] = useState("");
  const [busy, setBusy] = useState(mode === "source");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const installingRef = useRef(false);

  const request = useCallback(async (body: Record<string, unknown>) => {
    const response = await chatFetch(user, "/api/chat/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Device linking failed");
    return data;
  }, [user]);

  useEffect(() => {
    if (mode !== "source") return;
    let cancelled = false;
    void request({ action: "create" })
      .then((data) => {
        if (cancelled) return;
        setSessionId(data.sessionId);
        setLinkCode(data.code);
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to create link code"))
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
  }, [mode, request]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await chatFetch(
          user,
          `/api/chat/link?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Link session expired");
        if (cancelled) return;
        const nextSession = data.session as LinkSession;
        setSession(nextSession);
        if (mode === "target" && nextSession.status === "ready" && nextSession.encryptedIdentity && !installingRef.current) {
          installingRef.current = true;
          setBusy(true);
          const identity = await installLinkedChatIdentity(user.uid, nextSession.encryptedIdentity);
          const keyResponse = await chatFetch(user, "/api/chat/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: identity.publicKey }),
          });
          if (!keyResponse.ok) throw new Error("The linked key could not be registered");
          await request({ action: "confirm", sessionId });
          onLinked();
          return;
        }
        if (mode === "source" && nextSession.status === "consumed") return;
        timer = setTimeout(poll, 1500);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Device linking failed");
      } finally {
        if (!cancelled && installingRef.current) setBusy(false);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [mode, onLinked, request, sessionId, user]);

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      const identity = await ensureChatIdentity(user.uid);
      const localVerification = await chatKeyVerification(identity.publicKey);
      const data = await request({
        action: "request",
        code: linkCode,
        publicKey: identity.publicKey,
        deviceName: deviceName(),
      });
      if (data.verification !== localVerification) throw new Error("Device verification failed");
      setVerification(localVerification);
      setSessionId(data.sessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to join link session");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!session?.targetPublicKey) return;
    setBusy(true);
    setError("");
    try {
      const encryptedIdentity = await encryptChatIdentityForDevice(user.uid, session.targetPublicKey);
      await request({ action: "approve", sessionId, encryptedIdentity });
      setSession((current) => current ? { ...current, status: "ready" } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve this device");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const requested = mode === "source" && session?.status === "requested";
  const waitingForTransfer = mode === "target" && Boolean(sessionId);
  const transferReady = mode === "source" && session?.status === "ready";
  const complete = mode === "source" && session?.status === "consumed";

  return (
    <div className="fixed inset-0 z-[260] flex items-end justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="modal-solid w-full max-w-md rounded-3xl border border-white/[0.12] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
            {mode === "source" ? <Link2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{mode === "source" ? "Link another device" : "Link this device"}</h2>
            <p className="mt-1 text-sm leading-5 text-white/55">
              {mode === "source"
                ? "Keep this window open, then enter the code on your other device."
                : "Enter the code shown on a device that can already read your encrypted chats."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/50 hover:bg-white/[0.07] hover:text-white" aria-label="Close device linking">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        {mode === "source" && !requested && !transferReady && !complete && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">One-time code</p>
            <button type="button" onClick={copyCode} disabled={!linkCode} className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl border border-brand-green/35 bg-brand-green/10 px-4 py-4 text-2xl font-black tracking-[0.18em] text-brand-green disabled:opacity-50">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : linkCode || "Creating…"}
              {!busy && (copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />)}
            </button>
            <p className="mt-3 text-center text-xs text-white/45">Expires in 10 minutes. Do not share it with anyone else.</p>
          </div>
        )}

        {requested && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.035] p-4">
            <p className="text-sm font-semibold">Approve {session.targetDeviceName || "new device"}?</p>
            <p className="mt-2 text-xs text-white/50">Confirm this number is also displayed on the new device:</p>
            <div className="my-4 text-center text-3xl font-black tracking-[0.25em] text-brand-green">{session.verification}</div>
            <button type="button" onClick={approve} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Approve device
            </button>
          </div>
        )}

        {transferReady && <Status icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Encrypted key sent" detail="Waiting for the new device to finish linking…" />}
        {complete && <Status icon={<Check className="h-5 w-5" />} title="Device linked" detail="The new device can now read and send encrypted messages." />}

        {mode === "target" && !waitingForTransfer && (
          <div className="mt-5">
            <label htmlFor="device-link-code" className="text-xs font-semibold uppercase tracking-wide text-white/40">One-time code</label>
            <input
              id="device-link-code"
              value={linkCode}
              onChange={(event) => setLinkCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9))}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.1] bg-[#151a18] px-4 py-3 text-center text-xl font-bold tracking-[0.16em] outline-none focus:border-brand-green/60"
            />
            <button type="button" onClick={join} disabled={busy || linkCode.replace(/-/g, "").length !== 8} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Continue
            </button>
          </div>
        )}

        {mode === "target" && waitingForTransfer && (
          <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.035] p-4 text-center">
            <p className="text-xs text-white/50">Compare this number with your trusted device, then approve there:</p>
            <div className="my-4 text-3xl font-black tracking-[0.25em] text-brand-green">{verification}</div>
            <div className="flex items-center justify-center gap-2 text-sm text-white/65">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for approval…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4 text-brand-green">
      <div className="shrink-0">{icon}</div>
      <div><p className="text-sm font-bold">{title}</p><p className="mt-0.5 text-xs text-white/55">{detail}</p></div>
    </div>
  );
}
