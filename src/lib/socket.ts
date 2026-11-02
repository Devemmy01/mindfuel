import { loadFirebase, loadedFirebase } from "@/lib/firebase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void;

const PATH = "/api/socket";
const MAX_QUEUED = 50;

function getSocketUrl() {
  let origin = window.location.origin;
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configured) {
    try {
      const url = new URL(configured, window.location.origin);
      const configuredHost = url.hostname.replace(/^www\./, "");
      const currentHost = window.location.hostname.replace(/^www\./, "");
      // Avoid an HTTP canonical-host redirect during a WebSocket handshake.
      if (configuredHost !== currentHost) origin = url.origin;
    } catch {
      // Fall back to this origin.
    }
  }
  return `${origin.replace(/^http/, "ws")}${PATH}`;
}

/**
 * A small socket.io-style client over a plain WebSocket: `{ e, d }` JSON
 * frames, `connect`/`disconnect` events, emits queued while offline, and
 * unlimited reconnects with exponential backoff and jitter. Messages never
 * depend on it: REST is the durable path and polling covers gaps.
 */
class RealtimeSocket {
  connected = false;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private queue: string[] = [];
  private attempts = 0;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    window.addEventListener("online", this.wake);
    document.addEventListener("visibilitychange", this.wake);
  }

  connect() {
    this.stopped = false;
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return this;
    this.clearRetry();
    const ws = new WebSocket(getSocketUrl());
    this.ws = ws;
    ws.onopen = async () => {
      const { auth } = await loadFirebase();
      const token = await auth.currentUser?.getIdToken().catch(() => undefined);
      if (this.ws === ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ e: "auth", d: { token } }));
    };
    ws.onmessage = (event) => {
      let frame: { e?: string; d?: unknown };
      try {
        frame = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!frame.e) return;
      if (frame.e === "ready") {
        this.connected = true;
        this.attempts = 0;
        const pending = this.queue.splice(0);
        for (const raw of pending) ws.send(raw);
        this.fire("connect");
        return;
      }
      this.fire(frame.e, frame.d);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      const wasConnected = this.connected;
      this.connected = false;
      if (wasConnected) this.fire("disconnect");
      this.scheduleRetry();
    };
    return this;
  }

  disconnect() {
    this.stopped = true;
    this.clearRetry();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.close(1000);
    }
    if (this.connected) {
      this.connected = false;
      this.fire("disconnect");
    }
    return this;
  }

  destroy() {
    this.disconnect();
    window.removeEventListener("online", this.wake);
    document.removeEventListener("visibilitychange", this.wake);
    this.listeners.clear();
    this.queue = [];
  }

  on(event: string, listener: Listener) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, data?: unknown) {
    const raw = JSON.stringify(data === undefined ? { e: event } : { e: event, d: data });
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.queue.push(raw);
      if (this.queue.length > MAX_QUEUED) this.queue.shift();
    }
    return this;
  }

  private fire(event: string, data?: unknown) {
    for (const listener of Array.from(this.listeners.get(event) || [])) {
      try {
        if (data === undefined) listener();
        else listener(data);
      } catch (error) {
        console.error(`Realtime listener for ${event} failed`, error);
      }
    }
  }

  private scheduleRetry() {
    if (this.stopped || this.retryTimer) return;
    const base = Math.min(30_000, 1_000 * 2 ** this.attempts);
    this.attempts += 1;
    const delay = base * (0.5 + Math.random() * 0.5);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  /** Back online or back in the foreground: reconnect now instead of waiting out the backoff. */
  private wake = () => {
    if (this.stopped || this.connected || document.visibilityState === "hidden" || !navigator.onLine) return;
    this.attempts = 0;
    if (!this.ws) this.connect();
  };
}

let socket: RealtimeSocket | null = null;
let socketUser: string | null = null;

export function getSocket(userId: string) {
  if (socket && socketUser !== userId) closeSocket();
  if (!socket) {
    socket = new RealtimeSocket();
    socketUser = userId;
    socket.connect();
  } else if (!socket.connected && loadedFirebase()?.auth.currentUser?.uid === userId) {
    socket.connect();
  }
  return socket;
}

export function closeSocket() {
  socket?.destroy();
  socket = null;
  socketUser = null;
}
