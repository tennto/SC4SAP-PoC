/**
 * A Phosphor glyph.
 *
 * Phosphor ships as an icon font, so an icon is one `<i>` and a class name —
 * no per-icon component, no bundle growth as the catalog grows. Same library
 * and same regular weight as sc4sap.dev, loaded from the same CDN in
 * `app/layout.tsx`.
 *
 * Always `aria-hidden`: every icon in this app sits next to its own label, or
 * inside a control that already carries an `aria-label`. An icon that needed
 * announcing would be a labelling bug, not a reason to make this configurable.
 */
export function Icon({
  name,
  className,
}: {
  /** Phosphor name without the `ph-` prefix, e.g. `stethoscope`. */
  name: string;
  className?: string;
}) {
  return (
    <i
      className={`ph ph-${name}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}
