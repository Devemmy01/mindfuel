import { createServer } from "node:http";
import { Server } from "socket.io";
import { configureSocketServer } from "../src/lib/configure-socket";

// Vercel Functions gained native WebSocket support in June 2026. Exporting
// the HTTP server lets Vercel upgrade /api/socket without another host.
const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true, service: "mindfuel-realtime" }));
});

const io = new Server(server, {
  path: "/api/socket",
  transports: ["websocket", "polling"],
  // Mobile connections (iOS backgrounding in particular) die without a clean
  // close frame, so the default 20s/25s pair leaves a departed user showing
  // "online" for up to ~45s. Shorter heartbeats surface a dead connection
  // (and the resulting presence:update) in well under half that time.
  pingTimeout: 10_000,
  pingInterval: 15_000,
});

configureSocketServer(io);

export default server;
