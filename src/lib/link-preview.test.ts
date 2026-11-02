import { describe, expect, it } from "vitest";
import { checkUrl, isPublicAddress, parsePreview } from "./link-preview";

describe("link preview safety", () => {
  it("allows only public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) expect(isPublicAddress(ip), ip).toBe(true);
    for (const ip of [
      "127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
      "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254", "64:ff9b::a00:1", "not-an-ip",
    ]) expect(isPublicAddress(ip), ip).toBe(false);
  });

  it("rejects non-web schemes, credentials, odd ports and literal private IPs", () => {
    expect(checkUrl("https://example.com/a")).not.toBeNull();
    expect(checkUrl("http://example.com:80/")).not.toBeNull();
    for (const raw of [
      "file:///etc/passwd", "javascript:alert(1)", "ftp://example.com", "https://user:pw@example.com",
      "http://example.com:8080", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "not a url",
    ]) expect(checkUrl(raw), raw).toBeNull();
  });
});

describe("parsePreview", () => {
  it("prefers Open Graph, falls back to <title>, and decodes entities", () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Rest &amp; Recovery">
      <meta content="A short read." name="description">
      <meta property="og:site_name" content="Calm Blog"></head></html>`;
    expect(parsePreview(html, "https://x.test")).toEqual({ url: "https://x.test", title: "Rest & Recovery", description: "A short read.", siteName: "Calm Blog" });
    expect(parsePreview("<title> Just a title </title>", "https://y.test")).toEqual({ url: "https://y.test", title: "Just a title", description: undefined, siteName: undefined });
    expect(parsePreview("<p>no title</p>", "https://z.test")).toBeNull();
  });
});
