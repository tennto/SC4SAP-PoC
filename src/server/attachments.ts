/**
 * Files sent along with a prompt.
 *
 * The browser reads the file, base64-encodes it and posts it inside the
 * message body; this module decides whether that is something the model can
 * be handed and turns it into the content blocks the Anthropic API takes.
 *
 * What is accepted is exactly what the Messages API reads natively: the four
 * image types as `image` blocks, PDF as a `document` block, and plain text —
 * source files, logs, CSV — which is inlined as text under a heading that
 * names the file. Anything else (Office documents, archives, binaries) is
 * refused here rather than sent and refused by the API a round trip later.
 *
 * The ceilings are the API's where it has one (5 MB per image) and a web
 * budget where it does not: a 30 MB PDF would be accepted by the API and
 * would take a minute to upload over a base64 JSON body, sit in the replay
 * buffer for the life of the session, and cost a fortune in tokens. Nothing a
 * PoC needs.
 */
import type {
  ContentBlockParam,
  ImageBlockParam,
  DocumentBlockParam,
  TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
export const PDF_TYPE = "application/pdf";
export const TEXT_TYPE = "text/plain";

export type ImageType = (typeof IMAGE_TYPES)[number];
export type AttachmentType = ImageType | typeof PDF_TYPE | typeof TEXT_TYPE;

/** One file as it crosses the wire: base64 body plus what it was called. */
export type Attachment = {
  name: string;
  mediaType: AttachmentType;
  /** Decoded size in bytes — what the browser measured, re-checked here. */
  size: number;
  /** Base64, no data-URL prefix, no newlines. */
  data: string;
};

/** What the transcript keeps once the bytes have gone to the model. */
export type AttachmentMeta = Pick<Attachment, "name" | "mediaType" | "size">;

export const LIMITS = {
  /** The API's own ceiling for a base64 image. */
  imageBytes: 5 * 1024 * 1024,
  pdfBytes: 10 * 1024 * 1024,
  textBytes: 1 * 1024 * 1024,
  /** Per message. */
  maxFiles: 5,
  totalBytes: 20 * 1024 * 1024,
  nameLength: 200,
} as const;

/**
 * The JSON body ceiling that fits the limits above with base64 inflation
 * (4/3) and the text and context that ride along. Fastify's default is 1 MB.
 */
export const BODY_LIMIT = 32 * 1024 * 1024;

const TYPES: ReadonlySet<string> = new Set([...IMAGE_TYPES, PDF_TYPE, TEXT_TYPE]);

function isImage(type: AttachmentType): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

function ceilingFor(type: AttachmentType): number {
  if (isImage(type)) return LIMITS.imageBytes;
  if (type === PDF_TYPE) return LIMITS.pdfBytes;
  return LIMITS.textBytes;
}

function mb(bytes: number): string {
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

/**
 * Checks a request's `attachments` and returns them typed, or the reason the
 * request should be a 400. Nothing is decoded beyond measuring the base64:
 * the model is the only consumer of the bytes.
 */
export function validateAttachments(
  input: unknown,
): { ok: true; attachments: Attachment[] } | { ok: false; error: string } {
  if (input === undefined) return { ok: true, attachments: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "body.attachments must be an array" };
  }
  if (input.length > LIMITS.maxFiles) {
    return {
      ok: false,
      error: `at most ${LIMITS.maxFiles} files per message`,
    };
  }

  const attachments: Attachment[] = [];
  let total = 0;

  for (const [index, entry] of input.entries()) {
    const at = `body.attachments[${index}]`;
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, error: `${at} must be an object` };
    }
    const { name, mediaType, data } = entry as Record<string, unknown>;

    if (typeof name !== "string" || name.trim() === "") {
      return { ok: false, error: `${at}.name is required` };
    }
    if (typeof mediaType !== "string" || !TYPES.has(mediaType)) {
      return {
        ok: false,
        error: `${name}: unsupported type. Send images (PNG, JPEG, GIF, WebP), PDF, or plain text.`,
      };
    }
    if (typeof data !== "string" || data === "") {
      return { ok: false, error: `${at}.data must be base64` };
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      return { ok: false, error: `${name}: data is not base64` };
    }

    const type = mediaType as AttachmentType;
    // Decoded length from the base64 length, without decoding it.
    const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
    const size = (data.length * 3) / 4 - padding;
    const ceiling = ceilingFor(type);
    if (size > ceiling) {
      return {
        ok: false,
        error: `${name} is ${mb(size)}; the limit for this type is ${mb(ceiling)}.`,
      };
    }
    total += size;
    if (total > LIMITS.totalBytes) {
      return {
        ok: false,
        error: `Attachments total more than ${mb(LIMITS.totalBytes)}.`,
      };
    }

    attachments.push({
      name: name.trim().slice(0, LIMITS.nameLength),
      mediaType: type,
      size,
      data,
    });
  }

  return { ok: true, attachments };
}

export function toMeta(attachment: Attachment): AttachmentMeta {
  return {
    name: attachment.name,
    mediaType: attachment.mediaType,
    size: attachment.size,
  };
}

/**
 * The user turn as content blocks: files first, then the text, which is the
 * order the API documentation recommends — the question after the material
 * it is about.
 *
 * Text files are inlined rather than sent as `document` blocks. The model
 * reads a source file better with its name attached, and inlined text is
 * what the Read tool hands it anyway, so this is the shape it is used to.
 */
export function toContentBlocks(
  text: string,
  attachments: Attachment[],
): ContentBlockParam[] {
  const blocks: ContentBlockParam[] = [];

  for (const file of attachments) {
    if (isImage(file.mediaType)) {
      const block: ImageBlockParam = {
        type: "image",
        source: { type: "base64", media_type: file.mediaType, data: file.data },
      };
      blocks.push(block);
    } else if (file.mediaType === PDF_TYPE) {
      const block: DocumentBlockParam = {
        type: "document",
        title: file.name,
        source: { type: "base64", media_type: "application/pdf", data: file.data },
      };
      blocks.push(block);
    } else {
      const body = Buffer.from(file.data, "base64").toString("utf8");
      const block: TextBlockParam = {
        type: "text",
        text: `<attached_file name="${file.name.replace(/"/g, "'")}">\n${body}\n</attached_file>`,
      };
      blocks.push(block);
    }
  }

  if (text.trim() !== "" || blocks.length === 0) {
    blocks.push({ type: "text", text });
  }
  return blocks;
}
