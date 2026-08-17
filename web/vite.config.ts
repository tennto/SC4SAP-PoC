import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The backend has no CORS layer and deliberately binds to 127.0.0.1 only, so
 * the dev server proxies to it instead. Same-origin in the browser means the
 * SSE stream, the REST calls and any future cookie all behave in dev exactly
 * as they would behind one origin in a real deployment.
 */
const BACKEND = process.env.SC4SAP_BACKEND ?? "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/health": { target: BACKEND, changeOrigin: true },
      "/sessions": {
        target: BACKEND,
        changeOrigin: true,
        // Buffering would defeat token-level streaming (plan 3-2).
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            if (proxyRes.headers["content-type"]?.includes("text/event-stream")) {
              delete proxyRes.headers["content-length"];
            }
          });
        },
      },
    },
  },
});
