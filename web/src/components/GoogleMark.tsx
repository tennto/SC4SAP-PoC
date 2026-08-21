/**
 * Google's mark, as a raster asset rather than a Phosphor glyph.
 *
 * The rest of the app's icons are one monochrome icon family, and this is the
 * one place that is wrong: Google's brand guidance is that the button carries
 * their four-colour mark, not a redrawn outline of a G. So it sits outside the
 * `Icon` component deliberately, and is sized to match the glyph it replaced
 * rather than to any grid of its own.
 */
import Image from "next/image";

export function GoogleMark() {
  return (
    <Image
      className="google-mark"
      src="/assets/google_ic.png"
      alt=""
      aria-hidden="true"
      // Intrinsic size of the file. CSS sets what is actually rendered; these
      // are here so the aspect ratio is known before the bytes land.
      width={1024}
      height={1024}
      // Without this the optimizer would ship a variant sized for a hero.
      sizes="16px"
      // The only image on the sign-in screen, so Next flags it as the LCP
      // element and asks for it eagerly rather than lazily.
      priority
    />
  );
}
