import { EventEmitter } from "node:events";
import { createServer, type Server as HttpServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { getRealtimeHub, REALTIME_PATH } from "./src/lib/realtime/hub";

async function start() {
 const dev = process.env.NODE_ENV !== "production";
 const hostname = process.env.HOSTNAME || "0.0.0.0";
 const port = Number(process.env.PORT || 3000);
 // Next attaches its own "upgrade" listener to the server it's given (or the
 // first request's server) and destroys sockets it doesn't recognise. Give it
 // a stand-in that never fires and route upgrades below instead.
 const nextUpgradeSink = new EventEmitter() as unknown as HttpServer;
 const app = next({ dev, hostname, port, httpServer: nextUpgradeSink });
 const handler = app.getRequestHandler();
 await app.prepare();
 const upgradeNext = app.getUpgradeHandler();
 const httpServer = createServer(handler);
 // Same hub as app/api/socket/route.ts on Vercel; other upgrades (dev HMR) go to Next.
 const hub = getRealtimeHub();
 const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
 httpServer.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url || "/", "http://localhost");
  if (pathname === REALTIME_PATH) {
   wss.handleUpgrade(request, socket, head, (ws) => hub.attach(ws));
  } else {
   void upgradeNext(request, socket, head);
  }
 });

 let shuttingDown = false;
 const shutdown = async (signal: string) => {
   if (shuttingDown) return;
   shuttingDown = true;
   console.log(`\n> ${signal} received, closing MindFuel server...`);

   // Never leave a stale child alive if a dependency fails to close.
   const forceExit = setTimeout(() => process.exit(1), 5_000);
   forceExit.unref();

   await hub.close();
   wss.close();
   if (httpServer.listening) {
     await new Promise<void>((resolve) => httpServer.close(() => resolve()));
   }
   clearTimeout(forceExit);
   process.exit(0);
 };

 process.once("SIGINT", () => void shutdown("SIGINT"));
 process.once("SIGTERM", () => void shutdown("SIGTERM"));

 httpServer.listen(port, hostname, () => {
   console.log(`> MindFuel ready on http://${hostname}:${port} (realtime enabled)`);
 });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
