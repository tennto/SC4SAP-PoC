import type { Metadata } from "next";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { FavoritesProvider } from "@/lib/favorites";
import { getAccount } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "SC4SAP Web PoC",
  description: "Browser UI over the sc4sap plugin, via the Claude Agent SDK",
};

// Typography and icons: Pretendard for body and UI, Schibsted Grotesk for
// headings, IBM Plex Mono for identifiers, and Phosphor for icons. See the
// `--font-*` tokens in globals.css for why each one is where it is.
//
// Pretendard is not on Google Fonts, so it comes from jsDelivr — the same CDN
// Phosphor already uses. The `dynamic-subset` build is the one to link: it
// splits the family across `unicode-range`d subsets, so an English screen
// fetches the Latin slice and nothing else, and the ~2,800 Hangul syllables
// are only pulled by a page that actually sets Korean.
//
// Plain <link> rather than `next/font/google`, which downloads and inlines the
// files at build time — that would make a build require network access, and
// neither Pretendard nor Phosphor is on Google Fonts anyway. Every origin is
// `preconnect`ed, and globals.css keeps a platform stack behind each family
// ending in Malgun Gothic, so an offline load still sets Hangul.
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
    // `suppressHydrationWarning` because the script below writes an attribute
    // on this element before React sees it, which is exactly the mismatch the
    // warning is for — and exactly what has to happen for a dark-mode reader
    // not to be flashed a white screen.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First thing in the head, ahead of the stylesheets: it decides which
            palette those rules resolve to, and anything after the first paint
            is too late to prevent a flash. */}
        <script
          // The string is ours, built in `lib/theme.ts` — no user input reaches
          // it, which is the only reason this is allowed to exist.
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* Pretendard and Phosphor both. `crossOrigin` because a font file is
            fetched anonymously whatever its stylesheet was, and a preconnect
            without it opens a second connection the font cannot use. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+Oriya:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Ahead of the icon sheets below it, because this one sets the text
            of every screen and those only set glyphs beside it. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
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
