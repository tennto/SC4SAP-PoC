/**
 * Files the reader attaches to a prompt — the browser half.
 *
 * Mirrors the backend's `src/server/attachments.ts`: the same types, the same
 * ceilings. Checked here first so a file that will be refused is refused on
 * the click, with the reason, rather than after a 20 MB upload.
 *
 * Images are scaled down before they go. The API reads nothing past about
 * 1568 px on the long edge — larger images are resized server-side anyway,
 * and cost the upload and the wait for nothing. A 12 MP phone photo comes
 * down to a few hundred kilobytes this way and lands under the 5 MB ceiling
 * without the reader having to know there is one.
 */

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
export const PDF_TYPE = "application/pdf";
export const TEXT_TYPE = "text/plain";

export type AttachmentType =
  | (typeof IMAGE_TYPES)[number]
  | typeof PDF_TYPE
  | typeof TEXT_TYPE;

/** What is posted with the message. */
export type Attachment = {
  name: string;
  mediaType: AttachmentType;
  size: number;
  /** Base64, no data-URL prefix. */
  data: string;
};

/** What the transcript keeps and draws. */
export type AttachmentMeta = Pick<Attachment, "name" | "mediaType" | "size">;

/** A file chosen but not yet sent — what the composer's chips are made of. */
export type Draft = Attachment & {
  id: string;
  /** Object URL for an image thumbnail; revoked when the chip goes. */
  preview: string | null;
};

export const LIMITS = {
  imageBytes: 5 * 1024 * 1024,
  pdfBytes: 10 * 1024 * 1024,
  textBytes: 1 * 1024 * 1024,
  maxFiles: 5,
  totalBytes: 20 * 1024 * 1024,
} as const;

/** Long edge, in pixels, past which an image is scaled down before upload. */
const MAX_EDGE = 1568;

/**
 * Text files by extension. The browser reports `text/plain` for few of these
 * — `.abap` and `.log` come through with no type at all — so the name is what
 * decides. The list is what someone working on an SAP system attaches: source,
 * logs, exports, notes.
 */
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml",
  "log", "abap", "sql", "js", "ts", "py", "html", "css", "ini", "cfg",
  "conf", "properties", "diff", "patch",
]);

/** What the file picker offers: every type the backend will take. */
export const ACCEPT = [
  ...IMAGE_TYPES,
  PDF_TYPE,
  TEXT_TYPE,
  ...[...TEXT_EXTENSIONS].map((ext) => `.${ext}`),
].join(",");

export function isImageType(type: string): type is (typeof IMAGE_TYPES)[number] {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Decides what a file is, from its reported type first and its name second. */
export function classify(file: File): AttachmentType | null {
  if (isImageType(file.type)) return file.type;
  if (file.type === PDF_TYPE || extensionOf(file.name) === "pdf") return PDF_TYPE;
  if (file.type === TEXT_TYPE || file.type.startsWith("text/")) return TEXT_TYPE;
  if (TEXT_EXTENSIONS.has(extensionOf(file.name))) return TEXT_TYPE;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

function ceilingFor(type: AttachmentType): number {
  if (isImageType(type)) return LIMITS.imageBytes;
  if (type === PDF_TYPE) return LIMITS.pdfBytes;
  return LIMITS.textBytes;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Scales an image down to the long-edge ceiling, keeping its type. Returns
 * the original when it is already small enough, or when it is a GIF — a
 * redrawn GIF is one frame of it.
 */
async function downscale(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Not decodable here — let the API say so if it cannot read it either.
    return file;
  }

  const longEdge = Math.max(bitmap.width, bitmap.height);
  if (longEdge <= MAX_EDGE) {
    bitmap.close();
    return file;
  }

  const scale = MAX_EDGE / longEdge;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type, 0.9),
  );
  return blob ?? file;
}

export type Prepared =
  | { ok: true; draft: Draft }
  | { ok: false; error: string };

/**
 * Reads one chosen file into a draft, or says why it cannot be sent.
 *
 * `existing` is what is already attached, for the per-message ceilings.
 */
export async function prepare(
  file: File,
  existing: readonly Draft[],
): Promise<Prepared> {
  if (existing.length >= LIMITS.maxFiles) {
    return { ok: false, error: `At most ${LIMITS.maxFiles} files per message.` };
  }

  const type = classify(file);
  if (!type) {
    return {
      ok: false,
      error: `${file.name}: only images (PNG, JPEG, GIF, WebP), PDF and plain-text files can be attached.`,
    };
  }

  const blob = isImageType(type) ? await downscale(file) : file;
  const ceiling = ceilingFor(type);
  if (blob.size > ceiling) {
    return {
      ok: false,
      error: `${file.name} is ${formatBytes(blob.size)}; the limit for this type is ${formatBytes(ceiling)}.`,
    };
  }

  const total = existing.reduce((sum, draft) => sum + draft.size, 0) + blob.size;
  if (total > LIMITS.totalBytes) {
    return {
      ok: false,
      error: `Attachments would total more than ${formatBytes(LIMITS.totalBytes)}.`,
    };
  }

  if (type === TEXT_TYPE) {
    // A binary file with a text extension would go to the model as noise.
    const head = new Uint8Array(await blob.slice(0, 4096).arrayBuffer());
    if (head.includes(0)) {
      return { ok: false, error: `${file.name} is not a text file.` };
    }
  }

  return {
    ok: true,
    draft: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mediaType: type,
      size: blob.size,
      data: await toBase64(blob),
      preview: isImageType(type) ? URL.createObjectURL(blob) : null,
    },
  };
}

export function toMeta(draft: Draft): AttachmentMeta {
  return { name: draft.name, mediaType: draft.mediaType, size: draft.size };
}

export function toAttachment(draft: Draft): Attachment {
  return {
    name: draft.name,
    mediaType: draft.mediaType,
    size: draft.size,
    data: draft.data,
  };
}
