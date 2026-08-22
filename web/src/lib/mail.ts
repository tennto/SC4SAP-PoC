import "server-only";

/**
 * Outbound email, via Resend's REST API.
 *
 * Transport only — what the messages *say* is in `lib/mail-templates.ts`.
 *
 * Plain `fetch` rather than the `resend` SDK: the whole surface this app needs
 * is one POST with a bearer token, and a dependency that wraps one request is
 * a dependency to keep up to date for nothing.
 *
 * **Without `RESEND_API_KEY` the message is written to the server log instead
 * of being sent.** That is deliberate and it is what makes the reset flow work
 * on a fresh checkout with no mail account: the six digits appear in the
 * `next dev` terminal. It is a development affordance and nothing more — see
 * the warning `logInstead` prints.
 */

const ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend's shared sender, which works with no domain verification but will
 * only deliver to the address that owns the Resend account, and rejects
 * reserved test domains such as `example.com` outright. Sending to anyone else
 * needs a verified domain and `RESEND_FROM` pointed at it.
 */
const DEFAULT_FROM = "SC4SAP <onboarding@resend.dev>";

/**
 * A file carried with the message.
 *
 * With `contentId` set it is an *inline* part: it does not show up as a
 * download, and the HTML refers to it as `cid:<contentId>`. That is how the
 * logo gets into the message without being hosted anywhere — which matters
 * here, because the app it is sent from is on localhost and nothing in an
 * inbox can reach that.
 */
export type Attachment = {
  filename: string;
  /** Base64, no data-URI prefix. */
  content: string;
  contentType: string;
  /** Referenced from the HTML as `cid:<this>`. Omit for a plain attachment. */
  contentId?: string;
};

export type Mail = {
  to: string;
  subject: string;
  /**
   * Required, never optional. Some clients show only this, and an HTML-only
   * message also scores worse with spam filters than a multipart one.
   */
  text: string;
  html?: string;
  attachments?: Attachment[];
};

export type MailResult =
  /** Handed to Resend. Not a delivery guarantee — nothing here can promise that. */
  | { delivered: true; logged: false }
  /** No API key, so it went to the server log. */
  | { delivered: false; logged: true }
  /** Resend rejected it, or was unreachable. */
  | { delivered: false; logged: false; error: string };

function logInstead(mail: Mail): MailResult {
  // The plain-text part only. The HTML would bury the code in markup, and the
  // code is the entire reason anyone reads this banner.
  const parts = [mail.html ? "html" : null, mail.attachments?.length ? `${mail.attachments.length} attachment(s)` : null]
    .filter(Boolean)
    .join(" + ");

  console.warn(
    [
      "",
      "┌─ EMAIL NOT SENT — RESEND_API_KEY is not set ─────────────────────",
      "│ The message below was written here instead of being delivered.",
      "│ This is fine in development and is NOT fine anywhere else: any",
      "│ reset code printed here is readable by whoever can read this log.",
      "├──────────────────────────────────────────────────────────────────",
      `│ To:      ${mail.to}`,
      `│ Subject: ${mail.subject}`,
      ...(parts ? [`│ Also:    ${parts} (not shown)`] : []),
      "├──────────────────────────────────────────────────────────────────",
      ...mail.text.split("\n").map((line) => `│ ${line}`),
      "└──────────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
  return { delivered: false, logged: true };
}

/**
 * Never throws. Every caller of this is a request handler that must answer the
 * same way whether or not the mail went out — the reset endpoint in particular
 * deliberately reports success regardless, so that it cannot be used to work
 * out which addresses are registered.
 */
export async function sendMail(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return logInstead(mail);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? DEFAULT_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
        // Resend's REST field names are snake_case; only its SDK takes camel.
        ...(mail.attachments?.length
          ? {
              attachments: mail.attachments.map((file) => ({
                filename: file.filename,
                content: file.content,
                content_type: file.contentType,
                ...(file.contentId ? { content_id: file.contentId } : {}),
              })),
            }
          : {}),
      }),
      // Long enough for a slow API, short enough that the form is not left
      // hanging on it.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // Resend answers with a JSON body naming the problem — an unverified
      // sender domain, a recipient the shared sender may not reach. Worth
      // surfacing verbatim in the log, since the caller will not report it.
      const detail = await response.text().catch(() => "");
      const error = `Resend answered ${response.status}: ${detail.slice(0, 500)}`;
      console.error(`[mail] ${error}`);
      return { delivered: false, logged: false, error };
    }

    return { delivered: true, logged: false };
  } catch (err) {
    const error = `Could not reach Resend: ${(err as Error).message}`;
    console.error(`[mail] ${error}`);
    return { delivered: false, logged: false, error };
  }
}
