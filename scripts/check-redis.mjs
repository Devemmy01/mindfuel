/**
 * Check the realtime Redis connection: ping, publish/subscribe and expiry.
 *   vercel env pull --environment=production .env.production.local
 *   node --env-file=.env.production.local scripts/check-redis.mjs
 * Prints the host only, never the credentials.
 */
import Redis from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL is not set.");
  process.exit(1);
}
console.log("host:", new URL(url).hostname, "| tls:", url.startsWith("rediss://"));
const options = { connectTimeout: 8000, maxRetriesPerRequest: 1 };
const publisher = new Redis(url, options);
const subscriber = new Redis(url, options);
try {
  console.log("ping:", await publisher.ping());
  await subscriber.subscribe("mindfuel:selftest");
  const received = new Promise((resolve) => subscriber.on("message", (_channel, message) => resolve(message)));
  await publisher.publish("mindfuel:selftest", "hello");
  console.log("pub/sub:", await Promise.race([received, new Promise((resolve) => setTimeout(() => resolve("TIMED OUT"), 5000))]));
  await publisher.set("rt:selftest", "1", "EX", 5);
  console.log("set/get with expiry:", await publisher.get("rt:selftest"));
  console.log("Redis is ready for realtime.");
} catch (error) {
  console.error("Redis check failed:", error.message);
  process.exitCode = 1;
} finally {
  publisher.disconnect();
  subscriber.disconnect();
}
