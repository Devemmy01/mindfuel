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
});

configureSocketServer(io);

export default server;
