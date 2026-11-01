import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  auth: {
    authStateReady: async () => undefined,
    currentUser: { getIdToken: async () => "token-123" },
  },
}));

describe("installAuthedFetch", () => {
  it("adds the ID token to same-origin /api requests only", async () => {
    const calls: Array<{ url: string; auth: string | null }> = [];
    const nativeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), auth: new Headers(init?.headers).get("Authorization") });
      return new Response("{}");
    });
    vi.stubGlobal("window", { location: { origin: "https://mind-fuel.test" }, fetch: nativeFetch });

    const { installAuthedFetch } = await import("./authed-fetch");
    installAuthedFetch();

    await window.fetch("/api/notifications");
    await window.fetch("https://mind-fuel.test/api/posts", { headers: { Authorization: "Bearer explicit" } });
    await window.fetch("/feed");
    await window.fetch("https://evil.example/api/steal");

    expect(calls).toEqual([
      { url: "/api/notifications", auth: "Bearer token-123" },
      { url: "https://mind-fuel.test/api/posts", auth: "Bearer explicit" },
      { url: "/feed", auth: null },
      { url: "https://evil.example/api/steal", auth: null },
    ]);
    vi.unstubAllGlobals();
  });
});
