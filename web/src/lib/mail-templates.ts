import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment, Mail } from "@/lib/mail";

/**
 * What the app's one email actually says and looks like.
 *
 * Email HTML is not web HTML and none of `globals.css` applies here. No
 * external stylesheet is fetched, `<style>` blocks are stripped by some
 * clients, flexbox and grid are unreliable, and Outlook renders through Word.
 * So: tables for layout, every style inline, `bgcolor` attributes alongside
 * the CSS so the desktop clients that ignore one honour the other, and a
 * system font stack because a web font would not load.
 *
 * The palette is the app's — `#383838` ink on white, hairline borders — with
 * the translucent tokens flattened to the opaque values they resolve to on
 * white, since `rgba()` over an unknown backdrop is not a thing to rely on
 * here.
 */

/* Opaque equivalents of the app's ink-on-white tints. */
const INK = "#383838";
const INK_MUTED = "#8a8a8a";
const PAGE = "#f7f7f7";
const CARD = "#ffffff";
const LINE = "#e2e2e2";
const CODE_BG = "#f2f2f2";

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

/** What the HTML refers to as `cid:sc4sap-logo`. */
const LOGO_CID = "sc4sap-logo";

/**
 * The white mark, on the dark band at the top of the card.
 *
 * White-on-dark rather than black-on-white, and this is the whole reason the
 * header has a dark band at all. Clients that force dark mode recolour CSS but
 * never the pixels of an image, so a black transparent logo on a white panel
 * goes invisible the moment the panel is darkened for the reader. A band that
 * is already dark is left alone, and the mark stays legible either way.
 */
const LOGO_FILE = "sc4_w_logo.png";

/**
 * Read once per process and kept, because it is the same ~22KB on every send.
 * A failed read is not cached, so a fixed file is picked up without a restart.
 */
let logoPromise: Promise<Attachment | null> | undefined;

function loadLogo(): Promise<Attachment | null> {
  if (!logoPromise) {
    logoPromise = readFile(
      // `public/` is present in every shape a Next app is deployed in, which
      // an arbitrary directory beside it is not.
      path.join(process.cwd(), "public", "assets", LOGO_FILE),
    )
      .then((buffer): Attachment => ({
        filename: LOGO_FILE,
        content: buffer.toString("base64"),
        contentType: "image/png",
        contentId: LOGO_CID,
      }))
      .catch((err: unknown) => {
        console.error(
          `[mail] logo not attached: ${(err as Error).message}. The message is sent without it.`,
        );
        logoPromise = undefined;
        return null;
      });
  }
  return logoPromise;
}

/** Whatever lands in an inbox is untrusted until it is escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resetCodeHtml(code: string, minutes: number, hasLogo: boolean): string {
  const digits = escapeHtml(code);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Tells the clients that read it not to invent a dark rendering of a design
     that already states its own colours. -->
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>SC4SAP password reset</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE};">
<!-- Shown in the inbox list under the subject, so the first thing seen is the
     code rather than the first line of the paragraph. Hidden in the body by
     zero metrics — the standard preheader trick. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is ${digits}. It expires in ${minutes} minutes.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background-color:${PAGE};">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${CARD};border:1px solid ${LINE};border-radius:10px;overflow:hidden;">

<!-- Header band. Dark on purpose; see LOGO_FILE. -->
<tr>
<td align="center" bgcolor="${INK}" style="background-color:${INK};padding:28px 24px;">
${
  hasLogo
    ? `<img src="cid:${LOGO_CID}" width="44" height="44" alt="SC4SAP" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;">`
    : `<div style="font-family:${SANS};font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">SC4SAP</div>`
}
</td>
</tr>

<tr>
<td style="padding:32px 32px 8px 32px;">
<h1 style="margin:0 0 12px 0;font-family:${SANS};font-size:20px;line-height:1.3;font-weight:600;color:${INK};">Reset your password</h1>
<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.6;color:${INK};">
Someone asked to reset the password on the <strong>Super-Claude for SAP</strong> account for this address. Enter this code on the reset screen:
</p>
</td>
</tr>

<!-- The code as selectable text, never as an image: an image cannot be copied,
     and half the clients in the world block images by default. -->
<tr>
<td style="padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CODE_BG}" style="background-color:${CODE_BG};border-radius:8px;">
<tr>
<td align="center" style="padding:20px 16px;font-family:${MONO};font-size:30px;line-height:1.2;font-weight:600;letter-spacing:0.28em;color:${INK};">
<!-- The tracking adds a gap after the last digit; the indent pulls the run
     back so it reads as centred. -->
<span style="display:inline-block;text-indent:0.28em;">${digits}</span>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:0 32px 28px 32px;">
<p style="margin:0 0 16px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${INK};">
The code expires in <strong>${minutes} minutes</strong> and can be used once. Five wrong attempts cancel it.
</p>
<p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${INK_MUTED};">
If this was not you, nothing has changed and there is nothing to do — the code alone cannot sign anyone in, and your current password still works.
</p>
</td>
</tr>

<tr>
<td style="padding:0 32px 28px 32px;">
<div style="border-top:1px solid ${LINE};padding-top:18px;">
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${INK_MUTED};">
SC4SAP · Super-Claude for SAP<br>
This is an automated message. Replies are not read.
</p>
</div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

function resetCodeText(code: string, minutes: number): string {
  return [
    "Someone asked to reset the password on the SC4SAP account for this",
    "address. Enter this code on the reset screen:",
    "",
    `    ${code}`,
    "",
    `The code expires in ${minutes} minutes and can be used once. Five wrong`,
    "attempts cancel it.",
    "",
    "If this was not you, nothing has changed and there is nothing to do —",
    "the code alone cannot sign anyone in, and your current password still",
    "works.",
    "",
    "--",
    "SC4SAP · Super-Claude for SAP",
    "This is an automated message. Replies are not read.",
  ].join("\n");
}

/** The one message this app sends. */
export async function resetCodeMail(
  to: string,
  code: string,
  minutes: number,
): Promise<Mail> {
  const logo = await loadLogo();

  return {
    to,
    subject: `${code} is your SC4SAP password reset code`,
    text: resetCodeText(code, minutes),
    html: resetCodeHtml(code, minutes, logo !== null),
    attachments: logo ? [logo] : undefined,
  };
}
