"use client";

/**
 * An SM30 maintenance screen, drawn with the system's real rows.
 *
 * The frame is the one `web/config.html` drew its mock screens in — menu bar,
 * command field, title, application toolbar, the grey-headed table control,
 * "Position… / Entry 1 of N", status bar — kept as it was so the screen reads
 * as SAP GUI. What changed is what fills it: the columns are the view's own
 * fields with their DDIC labels, the rows are read from the system, and the
 * status bar says how many of how many are shown. It lays out in normal flow
 * and scrolls sideways, where the mock was a 1400px canvas scaled to fit.
 *
 * A view cluster (SM34) gets its dialog structure on the left, one member
 * view per entry, as the real transaction draws it.
 */
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { pick, type Screen } from "@/lib/img";

const MENU = ["Table View", "Edit", "Goto", "Selection", "Utilities", "System", "Help"];
/** The application toolbar, with the glyph SAP GUI puts beside each. */
const TOOLBAR: [string, string][] = [
  ["New Entries", "plus-square"],
  ["Copy As...", "copy"],
  ["Delete", "trash"],
  ["Undo Change", "arrow-counter-clockwise"],
  ["Select All", "check-square"],
  ["Deselect All", "square"],
  ["Position...", "crosshair"],
  ["Details", "magnifying-glass-plus"],
];

/** The standard toolbar beside the command field, in its three groups. */
const SYSTEM_ICONS = [
  ["check-circle", "is-ok"],
  ["floppy-disk", ""],
  ["arrow-left", "is-nav"],
  ["sign-out", "is-nav"],
  ["x-circle", "is-cancel"],
  ["printer", ""],
  ["binoculars", ""],
  ["caret-double-up", ""],
  ["caret-up", ""],
  ["caret-down", ""],
  ["caret-double-down", ""],
] as const;

/** Blank rows under the data, as the table control always shows some. */
const FILLER_ROWS = 3;

function Frame({
  screen,
  tcode,
  alias,
  children,
}: {
  screen: Screen;
  tcode: string;
  alias: string;
  children: React.ReactNode;
}) {
  const { t: messages, locale } = useLocale();
  const t = messages.configuration;
  const title = pick(screen.title, locale) || screen.object.name;
  return (
    <div className="sapw">
      <div className="sapw-menu">
        {MENU.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="sapw-cmd">
        <span className="sapw-okcode">{tcode}</span>
        <span className="sapw-icons" aria-hidden="true">
          {SYSTEM_ICONS.map(([name, tone]) => (
            <Icon key={name} name={name} className={tone || undefined} />
          ))}
        </span>
      </div>
      <div className="sapw-title">{t.screenTitle(title)}</div>
      <div className="sapw-toolbar" aria-hidden="true">
        {TOOLBAR.map(([label, icon]) => (
          <span key={label}>
            <Icon name={icon} />
            {label}
          </span>
        ))}
      </div>
      {children}
      <div className={`sapw-status${screen.note ? " is-warn" : ""}`}>
        <span>
          {screen.note
            ? `${t.withheld} — ${screen.note}`
            : `${t.liveValues} · ${t.statusShown(screen.rows.length, screen.total)}`}
        </span>
        <i>
          {alias} · {screen.object.name}
        </i>
      </div>
    </div>
  );
}

function Table({ screen }: { screen: Screen }) {
  const { t: messages, locale } = useLocale();
  const t = messages.configuration;
  return (
    <div className="sapw-body">
      <div className="sapw-scroll">
        <table className="sapw-table">
          <colgroup>
            <col className="sapw-sel" />
            {screen.columns.map((c) => (
              // Width follows the field's length, as the table control sizes it.
              <col key={c.id} style={{ width: `${Math.min(Math.max(c.length, 4), 40) * 0.62 + 1.4}em` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sapw-sel" />
              {screen.columns.map((c) => (
                <th key={c.id} title={c.name} className={c.key ? "is-key" : undefined}>
                  {pick(c.label, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {screen.rows.map((row, i) => (
              <tr key={i} className={i % 2 ? "alt" : undefined}>
                <td className="sapw-sel" />
                {screen.columns.map((c) => (
                  <td key={c.id} className={c.key ? "is-key" : undefined} title={row[c.id]}>
                    {row[c.id]}
                  </td>
                ))}
              </tr>
            ))}
            {Array.from({ length: FILLER_ROWS }, (_, i) => (
              <tr key={`f${i}`} className="is-filler">
                <td className="sapw-sel" />
                {screen.columns.map((c) => (
                  <td key={c.id} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sapw-pos">
        <span>{t.position}</span>
        <span>{screen.rows.length ? t.entryOf(screen.total ?? screen.rows.length) : t.noEntries}</span>
      </div>
    </div>
  );
}

/** One activity's screens: a single view, several, or a view cluster. */
export function SapScreens({
  screens,
  tcode,
  alias,
}: {
  screens: Screen[];
  tcode: string;
  alias: string;
}) {
  const { t: messages, locale } = useLocale();
  const t = messages.configuration;
  const [current, setCurrent] = useState(0);
  const screen = screens[Math.min(current, screens.length - 1)];
  if (!screen) return null;

  if (screen.kind === "none" && screens.length === 1) {
    return (
      <p className="img-empty">
        {t.noScreen} — {screen.note}
      </p>
    );
  }

  // Several screens: a cluster's dialog structure, or plain tabs.
  const cluster = screens.every((s) => s.cluster) ? screens[0]?.cluster : undefined;
  return (
    <Frame screen={screen} tcode={tcode} alias={alias}>
      {screens.length > 1 ? (
        <div className={cluster ? "sapw-split" : undefined}>
          {cluster ? (
            <nav className="sapw-dialog" aria-label={t.dialogStructure}>
              <b>{t.dialogStructure}</b>
              <ul>
                {screens.map((s, i) => (
                  <li key={s.object.name + i} style={{ paddingLeft: i ? 14 : 0 }}>
                    <button
                      type="button"
                      aria-current={i === current ? "true" : undefined}
                      onClick={() => setCurrent(i)}
                    >
                      <Icon
                        name={i === current ? "folder-open" : "folder-simple"}
                        weight="fill"
                        className="sapw-folder"
                      />
                      {pick(s.title, locale) || s.object.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <div className="sapw-tabs" role="tablist">
              {screens.map((s, i) => (
                <button
                  type="button"
                  role="tab"
                  key={s.object.name + i}
                  aria-selected={i === current}
                  onClick={() => setCurrent(i)}
                >
                  {pick(s.title, locale) || s.object.name}
                </button>
              ))}
            </div>
          )}
          {screen.kind === "table" ? <Table screen={screen} /> : <p className="img-empty">{screen.note}</p>}
        </div>
      ) : (
        <Table screen={screen} />
      )}
    </Frame>
  );
}
