import "server-only";

/**
 * Where the Fastify backend lives, as seen from the Next **server**.
 *
 * Server Components and the proxy route talk to this directly; the browser
 * never does — it only ever calls same-origin `/api/*`. That split is the
 * point of putting Next in front: the backend can stay bound to 127.0.0.1
 * with no CORS layer and no exposure, in dev and in deployment alike.
 */
export const BACKEND = process.env.SC4SAP_BACKEND ?? "http://127.0.0.1:3001";
