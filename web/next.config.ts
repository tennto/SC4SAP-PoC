import type { NextConfig } from "next";

/**
 * Nothing is rewritten here on purpose. The backend is reached through the
 * `/api/[...path]` Route Handler instead, because one of the proxied routes is
 * an SSE stream and that needs explicit control over buffering and over the
 * `Last-Event-ID` header — see `src/app/api/[...path]/route.ts`.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
