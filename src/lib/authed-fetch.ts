import { auth } from "@/lib/firebase";

let installed = false;

function isSameOriginApi(input: RequestInfo | URL) {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/**
 * Attach the signed-in user's Firebase ID token to every same-origin /api/*
 * request. API routes derive identity from this token only, so call sites and
 * SWR fetchers keep using plain `fetch` without repeating auth plumbing.
 */
export function installAuthedFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isSameOriginApi(input)) return nativeFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) {
      try {
        // Wait for Firebase to restore a persisted session so the first
        // requests after a reload are not sent as a guest.
        await auth.authStateReady();
        const token = await auth.currentUser?.getIdToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch {
        // Guests and token refresh failures fall through as anonymous requests.
      }
    }
    return nativeFetch(input, { ...init, headers });
  };
}
