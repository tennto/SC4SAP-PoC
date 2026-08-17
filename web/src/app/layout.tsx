import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SC4SAP Web PoC",
  description: "Browser UI over the sc4sap plugin, via the Claude Agent SDK",
};

// No `next/font/google` here on purpose: it fetches the font files at build
// time, which would make the build require network access for nothing. The
// system font stack is in globals.css.
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
      <body>{children}</body>
    </html>
  );
}
