import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { FavoritesProvider } from "@/lib/favorites";
import { getAccount } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "SC4SAP Web PoC",
  description: "Browser UI over the sc4sap plugin, via the Claude Agent SDK",
};

// Typography and icons are borrowed wholesale from sc4sap.dev: IBM Plex Sans
// (with the KR/JP cuts, so one family carries all three scripts) for body and
// UI, Schibsted Grotesk for headings, IBM Plex Mono for identifiers, and
// Phosphor for icons.
//
// Plain <link> rather than `next/font/google`, which downloads and inlines the
// files at build time — that would make a build require network access, and
// Phosphor would still need a link of its own. Both are `preconnect`ed, and
// globals.css keeps a system stack behind each family so an offline load
// degrades to what the app looked like before rather than to Times.
//
// Props are spelled out rather than using Next's generated `LayoutProps<"/">`
// global, which only exists once `next build` has emitted `.next/types` — so
// `npm run typecheck` would fail on a clean checkout.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Read here rather than in each screen, because the rail is in the layout
   * and the account control is in the rail — a page-level read would leave the
   * one component that shows who you are unable to see it.
   *
   * `getAccount` rather than `requireAccount`: this layout also wraps the
   * sign-in and sign-up screens, where having no session is the normal state.
   * Turning anonymous traffic away is `proxy.ts`'s job, and each protected
   * page re-checks with `requireAccount`.
   *
   * Touching cookies makes every route under this layout dynamic. That is
   * already true of the screens that matter — the dashboard is
   * `force-dynamic` and the chat is a live stream — and a statically cached
   * shell showing the previous visitor's name would be a bug, not an
   * optimisation.
   */
  const account = await getAccount();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css"
        />
        {/* Only for the favourite star's on-state; see `Icon`. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css"
        />
      </head>
      <body>
        {/* Above the shell because both the rail and the dashboard read it,
            and neither contains the other. */}
        <FavoritesProvider
          initial={account?.favorites ?? []}
          signedIn={account !== null}
        >
          {/* The rail lives in the layout, not in the pages, so it survives
              navigation instead of remounting on every route change. */}
          <AppShell account={account}>{children}</AppShell>
        </FavoritesProvider>
      </body>
    </html>
  );
}
