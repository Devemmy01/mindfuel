import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { configureSocketServer } from "./src/lib/configure-socket";

async function start() {
 const dev = process.env.NODE_ENV !== "production";
 const hostname = process.env.HOSTNAME || "0.0.0.0";
 const port = Number(process.env.PORT || 3000);
 const app = next({ dev, hostname, port });
 const handler = app.getRequestHandler();
 await app.prepare();
 const httpServer = createServer(handler);
 const io = new Server(httpServer, {
  path: "/api/socket",
  transports: ["websocket", "polling"],
 });
 const cleanupSocketServer = configureSocketServer(io);

 let shuttingDown = false;
 const shutdown = async (signal: string) => {
   if (shuttingDown) return;
   shuttingDown = true;
   console.log(`\n> ${signal} received, closing MindFuel server...`);

   // Never leave a stale child alive if a dependency fails to close.
   const forceExit = setTimeout(() => process.exit(1), 5_000);
   forceExit.unref();

   await new Promise<void>((resolve) => io.close(() => resolve()));
   await cleanupSocketServer();
   if (httpServer.listening) {
     await new Promise<void>((resolve) => httpServer.close(() => resolve()));
   }
   clearTimeout(forceExit);
   process.exit(0);
 };

 process.once("SIGINT", () => void shutdown("SIGINT"));
 process.once("SIGTERM", () => void shutdown("SIGTERM"));

 httpServer.listen(port, hostname, () => {
   console.log(`> MindFuel ready on http://${hostname}:${port} (Socket.IO enabled)`);
 });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
