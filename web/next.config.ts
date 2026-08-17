import type { NextConfig } from "next";

/**
 * Nothing is rewritten here on purpose. The backend is reached through the
 * `/api/[...path]` Route Handler instead, because one of the proxied routes is
 * an SSE stream and that needs explicit control over buffering and over the
 * `Last-Event-ID` header — see `src/app/api/[...path]/route.ts`.
 */
const nextConfig: NextConfig = {
  /**
   * Without this, `next dev` refuses to serve its own chunks and the HMR
   * socket to a browser that reached the page over `127.0.0.1` — the page
   * server-renders fine but never hydrates, so every button is dead. The rest
   * of the PoC (backend bind address, docs, curl examples) uses `127.0.0.1`,
   * so both spellings of loopback are allowed rather than picking one and
   * leaving the other silently broken.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
