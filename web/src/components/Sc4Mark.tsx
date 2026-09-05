/**
 * The SC4 mark.
 *
 * The same asset the reset mails carry (`lib/mail-templates.ts`), in its black
 * cut — the setup screen sits on the app's light ground, and the white one is
 * for the dark plate a mail client puts behind it.
 *
 * A mark rather than the `Super-Claude for SAP` wordmark used in the rail and
 * on the auth cards: this is the one screen where the brand is the whole
 * masthead rather than a label in a corner, and a 512px logotype set at rail
 * size would read as neither.
 */
import Image from "next/image";

export function Sc4Mark({ className }: { className?: string }) {
  return (
    // Both cuts, and CSS picks. The mark is flat black, so on the dark theme
    // the black one is a hole in the page — it was there and invisible. A
    // filter would have inverted it, but the white cut already exists and an
    // inverted black is not the same drawing as the one that was made white.
    //
    // Two elements rather than a `src` chosen in JavaScript, so the choice
    // survives the first paint: the theme is an attribute the browser has
    // before React runs, and a component that reads it would flash the wrong
    // one on every load. Only one is ever rendered — see `.sc4-mark-*`.
    <>
      <Image
        className={`sc4-mark-light${className ? ` ${className}` : ""}`}
        src="/assets/sc4_b_logo.png"
        alt="SC4"
        // Intrinsic size of the file. CSS sets what is actually rendered;
        // these are here so the aspect ratio is known before the bytes land.
        width={512}
        height={512}
        // Without this the optimizer would ship a variant sized for a hero.
        sizes="46px"
        // Top of the setup screen, so Next flags it as the LCP element and
        // asks for it eagerly rather than lazily.
        priority
      />
      <Image
        className={`sc4-mark-dark${className ? ` ${className}` : ""}`}
        src="/assets/sc4_w_logo.png"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        sizes="46px"
        priority
      />
    </>
  );
}
