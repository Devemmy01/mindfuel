import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache.js";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Registration is initiated by InstallPWA so the landing and app install
  // experiences share one controlled, non-spammy flow.
  register: false,
  skipWaiting: false,
  customWorkerDir: "worker",
  buildExcludes: [/dev-sw\.js$/, /app-build-manifest\.json$/],
  fallbacks: {
    document: "/offline",
    image: "",
    audio: "",
    video: "",
    font: "",
  },
  runtimeCaching: [
    {
      urlPattern: ({ url }: { url: URL }) =>
        url.origin === self.location.origin &&
        (url.pathname === "/api/socket" || url.pathname.startsWith("/api/chat/")),
      handler: "NetworkOnly",
      options: {
        cacheName: "mindfuel-realtime-network-only",
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) =>
        url.origin === self.location.origin && url.pathname === "/feed",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "mindfuel-feed-page-v1",
        expiration: { maxEntries: 8, maxAgeSeconds: 86_400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/api\/posts\/feed(?:\?.*)?$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "mindfuel-feed-data-v2",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 24, maxAgeSeconds: 86_400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/api\/(?:posts(?:\/|\?|$)|users\/|hashtags\/|tips\/|follows(?:\?|$))/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "mindfuel-public-data-v1",
        expiration: { maxEntries: 96, maxAgeSeconds: 86_400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: ({ request, url }: { request: Request; url: URL }) =>
        url.origin === self.location.origin &&
        (request.mode === "navigate" || url.searchParams.has("_rsc")) &&
        url.pathname !== "/",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "mindfuel-app-pages-v1",
        expiration: { maxEntries: 48, maxAgeSeconds: 86_400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    ...defaultRuntimeCaching,
  ],
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Reduces retained webpack graph data during long development sessions.
    webpackMemoryOptimizations: true,
  },
  // Do not retain every route visited during a long dev session. Shared app
  // modules stay warm, while inactive page compilations are released sooner.
  onDemandEntries: {
    maxInactiveAge: 60_000,
    pagesBufferLength: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https" as const,
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https" as const,
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https" as const,
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/#about",
        permanent: true,
      },
      {
        source: "/features",
        destination: "/#features",
        permanent: true,
      },
    ];
  },
};

// `disable: true` still initializes next-pwa's webpack wrapper. Avoid loading
// it altogether in development; Next already handles the dev worker cleanup.
export default process.env.NODE_ENV === "development"
  ? nextConfig
  // next-pwa's bundled NextConfig type predates this Next 15 experimental flag.
  : withPWA(nextConfig as unknown as Parameters<typeof withPWA>[0]);
