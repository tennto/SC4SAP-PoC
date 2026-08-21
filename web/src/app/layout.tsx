import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { FavoritesProvider } from "@/lib/favorites";

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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <FavoritesProvider>
          {/* The rail lives in the layout, not in the pages, so it survives
              navigation instead of remounting on every route change. */}
          <AppShell>{children}</AppShell>
        </FavoritesProvider>
      </body>
    </html>
  );
}
