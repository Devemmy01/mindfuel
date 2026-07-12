import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      path: "/api/socket",
      auth: { userId },
      transports: ["websocket"],
    });
  } else if (socket.auth && (socket.auth as { userId?: string }).userId !== userId) {
    socket.auth = { userId };
    socket.disconnect().connect();
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
