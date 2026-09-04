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
    <Image
      className={className}
      src="/assets/sc4_b_logo.png"
      alt="SC4"
      // Intrinsic size of the file. CSS sets what is actually rendered; these
      // are here so the aspect ratio is known before the bytes land.
      width={512}
      height={512}
      // Without this the optimizer would ship a variant sized for a hero.
      sizes="46px"
      // Top of the setup screen, so Next flags it as the LCP element and asks
      // for it eagerly rather than lazily.
      priority
    />
  );
}
