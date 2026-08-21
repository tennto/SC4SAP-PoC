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
  weight = "regular",
  className,
}: {
  /** Phosphor name without the `ph-` prefix, e.g. `stethoscope`. */
  name: string;
  /**
   * Phosphor ships one stylesheet per weight and each sets its own family, so
   * a weight is a different class prefix rather than a `font-weight`. Only the
   * two loaded in `app/layout.tsx` are offered: regular for everything, and
   * fill for the one place an icon is a two-state control — a hollow star
   * means "not starred" and a solid one means "starred", which is the whole
   * affordance.
   */
  weight?: "regular" | "fill";
  className?: string;
}) {
  // `ph` always, `ph-fill` on top of it. The weight classes each set their own
  // `font-family`, and the fill stylesheet is linked after the regular one, so
  // the later rule wins the family while `ph` still carries the shared box
  // metrics — and, more to the point, keeps every `.ph` sizing rule in this app
  // applying to a filled icon as well as a hollow one.
  const prefix = weight === "fill" ? "ph ph-fill" : "ph";
  return (
    <i
      className={`${prefix} ph-${name}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}
