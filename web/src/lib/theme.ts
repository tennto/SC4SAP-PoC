/**
 * Light, dark, or whatever the machine is set to.
 *
 * The choice lives on `<html data-theme>` and in `localStorage`, and nowhere
 * else — no context, no provider. A theme is one attribute on one element, and
 * every rule that reacts to it is CSS; wrapping that in React state would mean
 * a re-render of the whole app to change something the browser can do without
 * one.
 *
 * `system` is a real third option rather than an absent one. Someone whose
 * machine flips to dark in the evening wants the app to follow, and a two-way
 * switch cannot express that — it can only record whichever side they last
 * happened to be on.
 */

export const THEMES = ["system", "light", "dark"] as const;

/**
 * Screens that are always light.
 *
 * The rule: a screen with no way to change the theme does not get one
 * imposed on it, so it is light. Sign-in, sign-up, the password reset and
 * the setup wizard render without the rail, and the account menu — where
 * the theme lives — is in the rail; they are light for everyone. The two
 * legal documents are reachable signed out, in which case they render in
 * their own frame with no rail either, and are light too; signed in they
 * sit inside the rail like any other screen and follow the choice. Same
 * lists as `BARE_ROUTES` and `LEGAL_ROUTES` in `AppShell`, for the same
 * reason.
 */
export const LIGHT_ONLY_ROUTES = ["/signin", "/signup", "/forgot", "/setup"];
export const LEGAL_ROUTES = ["/terms", "/privacy"];

const under = (pathname: string, routes: string[]): boolean =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export function isLightOnly(pathname: string, signedIn: boolean): boolean {
  return under(pathname, LIGHT_ONLY_ROUTES) || (!signedIn && under(pathname, LEGAL_ROUTES));
}

export type Theme = (typeof THEMES)[number];

/** Where the choice is kept. Read by the inline script in `app/layout.tsx`. */
export const THEME_KEY = "sc4sap.theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** The stored choice, or `system` when there is none to read. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Private mode, or storage refused. `system` is the honest default: it is
    // what the app does when it has been told nothing.
    return "system";
  }
}

/**
 * Put the choice on the document, and remember it.
 *
 * `system` removes the attribute rather than resolving the media query and
 * writing the answer: the stylesheet already has a `prefers-color-scheme`
 * block, and an attribute holding a snapshot of that query would stop tracking
 * it the moment the machine changed.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The theme still applies for this session; only the next visit forgets.
  }
}

/**
 * Put the right theme on the document for `pathname`, without changing the
 * stored choice.
 *
 * A light-only route pins the attribute to `light`; every other route puts
 * back whatever is stored. Called on each client-side navigation, because
 * the boot script below only runs on a full load — signing out lands on
 * `/signin` through the router, and finishing setup leaves it the same way.
 */
export function syncTheme(pathname: string, signedIn: boolean): void {
  const root = document.documentElement;
  if (isLightOnly(pathname, signedIn)) {
    root.setAttribute("data-theme", "light");
    return;
  }
  const theme = readTheme();
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/**
 * The script that runs before the first paint, for a reader who is or is not
 * signed in.
 *
 * Inline and synchronous in `<head>`, because anything later is too late: React
 * hydrates after the first frame, so a theme applied there means a dark-mode
 * reader gets a white screen flashed at them on every navigation. Written as a
 * string because it must be in the HTML the server sends, not in a bundle the
 * browser has to fetch first.
 *
 * Deliberately tiny and total — a `try` around the whole thing. A page that
 * renders light because storage was unavailable is a small disappointment; one
 * that renders nothing because a theme script threw is not.
 */
export function themeBootScript(signedIn: boolean): string {
  // The session cookie is httpOnly, so the script cannot see it; the layout,
  // which has already resolved the session, bakes the answer in.
  const lightRoutes = signedIn ? LIGHT_ONLY_ROUTES : [...LIGHT_ONLY_ROUTES, ...LEGAL_ROUTES];
  return `
try {
  var p = location.pathname;
  var light = ${JSON.stringify(lightRoutes)}.some(function (r) {
    return p === r || p.indexOf(r + "/") === 0;
  });
  var t = light ? "light" : localStorage.getItem(${JSON.stringify(THEME_KEY)});
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
  }
} catch (e) {}
`.trim();
}
