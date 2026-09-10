"use client";

import { Icon } from "@/components/Icon";
import { formatBytes, isImageType, PDF_TYPE } from "@/lib/attachments";
import type { AttachmentMeta } from "@/lib/types";

/**
 * One attached file, as a chip: a thumbnail where there is one, a glyph for
 * the type where there is not, the name, and the size.
 *
 * Shared by the composer, where the chip has a remove button and an image
 * preview, and the transcript, where it is a record of what was sent — the
 * bytes are gone by then, so a stored image is a glyph like any other file.
 */
export function FileChip({
  file,
  preview = null,
  onRemove,
}: {
  file: AttachmentMeta;
  /** Object URL of an image thumbnail; only the composer has one. */
  preview?: string | null;
  onRemove?: () => void;
}) {
  const glyph = isImageType(file.mediaType)
    ? "image"
    : file.mediaType === PDF_TYPE
      ? "file-pdf"
      : "file-text";

  return (
    <span className="file-chip" title={`${file.name} · ${formatBytes(file.size)}`}>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="file-chip-thumb" src={preview} alt="" />
      ) : (
        <span className="file-chip-glyph">
          <Icon name={glyph} />
        </span>
      )}
      <span className="file-chip-name">{file.name}</span>
      <span className="file-chip-size">{formatBytes(file.size)}</span>
      {onRemove && (
        <button
          type="button"
          className="file-chip-remove"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
        >
          <Icon name="x" />
        </button>
      )}
    </span>
  );
}
