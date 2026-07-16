import { io, Socket } from "socket.io-client";
import { auth } from "@/lib/firebase";

let socket: Socket | null = null;

function getSocketOrigin() {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!configured) return window.location.origin;
  try {
    const url = new URL(configured, window.location.origin);
    const configuredHost = url.hostname.replace(/^www\./, "");
    const currentHost = window.location.hostname.replace(/^www\./, "");
    // Avoid an HTTP canonical-host redirect during a WebSocket handshake.
    if (configuredHost === currentHost) return window.location.origin;
    return url.origin;
  } catch {
    return window.location.origin;
  }
}

export function getSocket(userId: string) {
  if (!socket) {
    socket = io(getSocketOrigin(), {
      path: "/api/socket",
      auth: async (callback) => {
        const token = await auth.currentUser?.getIdToken();
        callback({ token });
      },
      addTrailingSlash: false,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5_000,
      timeout: 12_000,
    });
  } else if (!socket.connected && auth.currentUser?.uid === userId) {
    socket.disconnect().connect();
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
