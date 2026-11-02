import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/**
 * Server-side link preview fetch, hardened against SSRF: http(s) on default
 * ports only, every resolved address must be public (checked at connect time,
 * so DNS rebinding can't swap in a private IP), redirects are re-checked, and
 * the body is capped and time-limited. Nothing is logged or stored.
 */

export type LinkPreview = { url: string; title: string; description?: string; siteName?: string };

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 4_000;
const MAX_REDIRECTS = 3;

function ipv4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True only for globally routable unicast addresses. */
export function isPublicAddress(ip: string) {
  const version = net.isIP(ip);
  if (version === 4) return !ipv4Private(ip);
  if (version !== 6) return false;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return !ipv4Private(mapped[1]);
  return !(
    lower === "::" || lower === "::1" ||
    /^f[cd]/.test(lower) ||       // unique local fc00::/7
    /^fe[89ab]/.test(lower) ||    // link-local fe80::/10
    /^ff/.test(lower) ||          // multicast
    /^64:ff9b:/.test(lower) ||    // NAT64 can reach private IPv4
    /^2001:db8:/.test(lower)
  );
}

export function checkUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))) return null;
  return url;
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = (Array.isArray(addresses) ? addresses : [addresses]) as dns.LookupAddress[];
    const blocked = list.find((entry) => !isPublicAddress(entry.address));
    if (blocked || !list.length) return callback(new Error("Blocked address"), "", 0);
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function fetchOnce(url: URL): Promise<{ status: number; location?: string; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(url, {
      lookup: safeLookup,
      timeout: TIMEOUT_MS,
      headers: { "User-Agent": "MindFuelLinkPreview/1.0 (+https://mind-fuel.app)", Accept: "text/html,application/xhtml+xml" },
    }, (response) => {
      const status = response.statusCode || 0;
      const contentType = String(response.headers["content-type"] || "");
      if (status >= 300 && status < 400) {
        response.resume();
        return resolve({ status, location: String(response.headers.location || ""), body: "", contentType });
      }
      if (!/text\/html|application\/xhtml/.test(contentType)) {
        response.destroy();
        return resolve({ status, body: "", contentType });
      }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        chunks.push(chunk);
        // The <head> is all we need; stop early.
        if (size >= MAX_BYTES) response.destroy();
      });
      response.on("close", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8"), contentType }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("Timed out")));
    request.on("error", reject);
  });
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, keys: string[]) {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i",
    );
    const match = html.match(pattern);
    const value = match?.[1] ?? match?.[2];
    if (value) return decodeEntities(value);
  }
  return undefined;
}

export function parsePreview(html: string, url: string): LinkPreview | null {
  const head = html.slice(0, MAX_BYTES);
  const title = meta(head, ["og:title", "twitter:title"]) || decodeEntities(head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "");
  if (!title) return null;
  const description = meta(head, ["og:description", "twitter:description", "description"]);
  const siteName = meta(head, ["og:site_name"]);
  return {
    url,
    title: title.slice(0, 200),
    description: description ? description.slice(0, 300) : undefined,
    siteName: siteName ? siteName.slice(0, 80) : undefined,
  };
}

export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  let url = checkUrl(raw);
  for (let hop = 0; url && hop <= MAX_REDIRECTS; hop += 1) {
    const result = await fetchOnce(url);
    if (result.location) {
      url = checkUrl(new URL(result.location, url).toString());
      continue;
    }
    if (result.status < 200 || result.status >= 300 || !result.body) return null;
    return parsePreview(result.body, url.toString());
  }
  return null;
}
