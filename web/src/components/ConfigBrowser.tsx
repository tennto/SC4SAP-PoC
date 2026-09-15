"use client";

/**
 * Configuration Setting — the three-pane browser.
 *
 * A port of `web/config.html`'s layout into the app: the IMG tree on the
 * left, the overview or the item article in the middle, the reference panel
 * on the right. Layout only. What runs here is what a layout needs to be
 * seen in every state — pick an item, search the tree, fold a node, open the
 * reference panel — all of it against the sample rows in
 * `lib/config-catalog.ts` and none of it against a backend. The search is a
 * substring filter over the sample; the reference panel is a placeholder
 * with the sections the HTML draws.
 */
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useLocale } from "@/lib/i18n/client";
import {
  CONFIG_AREAS,
  CONFIG_ITEMS,
  CONFIG_MODULES,
  CONFIG_TOTAL,
  findConfigItem,
  type ConfigItem,
  type ConfigModule,
} from "@/lib/config-catalog";

type TreeNode = {
  name: string;
  children: TreeNode[];
  items: ConfigItem[];
};

/** The IMG tree: one node per path segment, items on the last one. */
function buildTree(items: ConfigItem[]): TreeNode {
  const root: TreeNode = { name: "", children: [], items: [] };
  for (const item of items) {
    const segs = item.path.split(" > ").map((s) => s.trim()).filter(Boolean);
    let node = root;
    for (const seg of segs.slice(0, -1)) {
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, children: [], items: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.items.push(item);
  }
  return root;
}

function leafName(item: ConfigItem): string {
  const segs = item.path.split(" > ");
  return segs[segs.length - 1]?.trim() || item.item;
}

function countItems(node: TreeNode): number {
  return node.items.length + node.children.reduce((n, c) => n + countItems(c), 0);
}

function nodeKey(trail: string[]): string {
  return trail.join(" > ");
}

/** Every folder key under `node`, so "expand all" has a list to set. */
function allKeys(node: TreeNode, trail: string[] = []): string[] {
  const out: string[] = [];
  for (const child of node.children) {
    const next = [...trail, child.name];
    out.push(nodeKey(next), ...allKeys(child, next));
  }
  return out;
}

/** The transaction chips: `(SPRO)` is drawn as its own kind. */
function TcChips({ tc }: { tc: string }) {
  return (
    <div className="cfg-tcs">
      {tc.split(" / ").map((code) => (
        <span
          key={code}
          className={`cfg-tc${code.includes("SPRO") ? " is-spro" : ""}`}
        >
          {code.trim()}
        </span>
      ))}
    </div>
  );
}

export function ConfigBrowser() {
  const { t: messages } = useLocale();
  const t = messages.configuration;

  const [current, setCurrent] = useState<number | null>(null);
  const [term, setTerm] = useState("");
  const [refOpen, setRefOpen] = useState(false);
  // Which module's list is shown. One entry today; the control is the shape
  // the next module drops into.
  const [module, setModule] = useState<ConfigModule>(CONFIG_MODULES[0].value);
  const items = useMemo(() => CONFIG_ITEMS.filter((row) => row.module === module), [module]);
  const tree = useMemo(() => buildTree(items), [items]);
  // Open by default down to the second level — the area and its section —
  // which is what the HTML opens on load.
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set(
        tree.children.flatMap((area) => [
          nodeKey([area.name]),
          ...area.children.map((sec) => nodeKey([area.name, sec.name])),
        ]),
      ),
  );

  const needle = term.trim().toLowerCase();
  const matches = (item: ConfigItem): boolean =>
    !needle ||
    [item.item, item.sub, item.tc, item.path, item.desc, item.tbl]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  const shownCount = items.filter(matches).length;

  const toggle = (key: string): void =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pickModule = (next: string): void => {
    setModule(next as ConfigModule);
    // The article and the open folders belong to the list being left.
    setCurrent(null);
    setRefOpen(false);
  };

  const show = (no: number): void => {
    const item = findConfigItem(no);
    if (!item) return;
    // Unfold the path down to the item so the tree shows where it lives.
    const segs = item.path.split(" > ").map((s) => s.trim());
    setOpen((prev) => {
      const next = new Set(prev);
      for (let i = 1; i < segs.length; i++) next.add(nodeKey(segs.slice(0, i)));
      return next;
    });
    setCurrent(no);
  };

  const renderNode = (node: TreeNode, trail: string[], level: number) => {
    const visibleItems = node.items.filter(matches);
    const childRows = node.children
      .map((child) => renderNode(child, [...trail, child.name], level + 1))
      .filter((row): row is React.ReactElement => row !== null);
    if (visibleItems.length === 0 && childRows.length === 0) return null;
    const key = nodeKey(trail);
    const isOpen = open.has(key) || needle.length > 0;
    return (
      <li
        key={key}
        className={`cfg-node${level === 0 ? " is-root" : ""}${isOpen ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="cfg-node-row"
          style={{ paddingLeft: 8 + level * 14 }}
          aria-expanded={isOpen}
          onClick={() => toggle(key)}
        >
          <span className="cfg-twist">
            <Icon name="caret-right" />
          </span>
          <span className="cfg-node-label">{node.name}</span>
          <span className="cfg-count">{countItems(node)}</span>
        </button>
        {isOpen ? (
          <ul>
            {childRows}
            {visibleItems.map((item) => (
              <li key={item.no} className="cfg-leaf">
                <button
                  type="button"
                  className={`cfg-leaf-row${current === item.no ? " active" : ""}`}
                  style={{ paddingLeft: 22 + level * 14 }}
                  aria-current={current === item.no ? "true" : undefined}
                  onClick={() => show(item.no)}
                >
                  <span className="cfg-leaf-dot" />
                  <span className="cfg-leaf-main">
                    <span className="cfg-leaf-label">
                      {leafName(item)}
                      {item.verified ? (
                        <span className="cfg-check" title={t.verified}>
                          <Icon name="check" />
                        </span>
                      ) : null}
                    </span>
                    <span className="cfg-leaf-sub">
                      {item.item} · {item.tc}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  };

  const item = current === null ? null : (findConfigItem(current) ?? null);

  return (
    <div className={`cfg${refOpen ? " is-ref-open" : ""}`}>
      {/* ---------- left: the IMG tree ---------- */}
      <aside className="cfg-side" aria-label={t.treeLabel}>
        <div className="cfg-search">
          <label className="cfg-search-box">
            <Icon name="magnifying-glass" />
            <input
              type="search"
              value={term}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchLabel}
              onChange={(event) => setTerm(event.target.value)}
            />
          </label>
          <div className="cfg-module">
            <span className="cfg-module-label" id="cfg-module-label">
              {t.moduleLabel}
            </span>
            <Select
              name="module"
              value={module}
              options={CONFIG_MODULES}
              labelledBy="cfg-module-label"
              onChange={pickModule}
            />
            <span className="cfg-search-count">
              {shownCount} / {items.length}
            </span>
          </div>
        </div>

        <div className="cfg-tools">
          <button type="button" className="ghost" onClick={() => setOpen(new Set(allKeys(tree)))}>
            {t.expandAll}
          </button>
          <button type="button" className="ghost" onClick={() => setOpen(new Set())}>
            {t.collapseAll}
          </button>
          <button
            type="button"
            className="ghost"
            aria-current={current === null ? "true" : undefined}
            onClick={() => setCurrent(null)}
          >
            <Icon name="house-line" /> {t.overview}
          </button>
        </div>

        <div className="cfg-tree" role="tree">
          <ul>{tree.children.map((child) => renderNode(child, [child.name], 0))}</ul>
        </div>
      </aside>

      {/* ---------- middle: overview or the item ---------- */}
      <main className="cfg-main">
        {item === null ? (
          <div className="cfg-overview">
            <h2>{t.overviewTitle}</h2>
            <p className="cfg-lead">{t.overviewLede(CONFIG_TOTAL)}</p>
            <div className="cfg-flow">
              {CONFIG_AREAS.map((area) => (
                <a key={area.step} href={`#cfg-area-${area.step}`}>
                  {area.step}. {area.name}
                </a>
              ))}
            </div>

            {CONFIG_AREAS.map((area) => {
              const areaItems = items.filter((row) => area.groups.includes(row.g));
              return (
                <section className="cfg-area" id={`cfg-area-${area.step}`} key={area.step}>
                  <h3>
                    <span className="cfg-step">{area.step}</span>
                    {area.name}
                    <span className="cfg-area-count">{t.itemCount(areaItems.length)}</span>
                  </h3>
                  <p className="cfg-area-desc">{area.desc}</p>
                  <div className="cfg-acards">
                    {area.groups.map((groupName) => {
                      const rows = areaItems.filter((row) => row.g === groupName);
                      const subs = [...new Set(rows.map((row) => row.sub))];
                      return (
                        <div className="cfg-acard" key={groupName}>
                          <b>
                            {groupName.replace(/^\d+\.\s*/, "")}
                            <span className="cfg-count">{rows.length}</span>
                          </b>
                          <div className="cfg-subs">
                            {subs.length === 0 ? (
                              <span className="cfg-empty">{t.noSample}</span>
                            ) : (
                              subs.map((sub) => {
                                const first = rows.find((row) => row.sub === sub);
                                return (
                                  <button
                                    type="button"
                                    key={sub}
                                    onClick={() => first && show(first.no)}
                                  >
                                    {sub}
                                    <span className="cfg-count">
                                      {rows.filter((row) => row.sub === sub).length}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <p className="cfg-legend">
              <span className="cfg-tc is-spro">(SPRO)</span> {t.legendSpro}
              <br />
              {t.legendNote}
            </p>
          </div>
        ) : (
          <article className="cfg-detail">
            <div className="cfg-topbar">
              <button type="button" className="ghost" onClick={() => setCurrent(null)}>
                <Icon name="arrow-left" /> {t.back}
              </button>
              <button type="button" className="ghost" onClick={() => setCurrent(null)}>
                <Icon name="house-line" /> {t.overview}
              </button>
              <button
                type="button"
                className="ghost cfg-ref-toggle"
                aria-pressed={refOpen}
                onClick={() => setRefOpen((v) => !v)}
              >
                <Icon name="paperclip" /> {t.references}
              </button>
            </div>

            <div className="cfg-navtree" aria-label={t.imgPath}>
              {item.path.split(" > ").map((seg, i, segs) => {
                const last = i === segs.length - 1;
                return (
                  <div className={`cfg-nt${last ? " is-leaf" : ""}`} key={seg + i}>
                    {i > 0 ? (
                      <span className="cfg-nt-branch" style={{ marginLeft: (i - 1) * 16 }}>
                        └─
                      </span>
                    ) : null}
                    <span className="cfg-nt-ico" />
                    <span className="cfg-nt-label">{seg}</span>
                  </div>
                );
              })}
            </div>

            <h2>
              <span className="cfg-no">No. {item.no}</span>
              {leafName(item)}
              <span className={`cfg-req ${item.req === "필수" ? "is-req" : "is-opt"}`}>
                {item.req === "필수" ? t.required : t.optional}
              </span>
            </h2>
            <TcChips tc={item.tc} />

            <section className="cfg-card">
              <h3>{t.cardContent}</h3>
              <p>{item.desc}</p>
            </section>

            <section className="cfg-card">
              <h3>{t.cardRelated}</h3>
              <div className="cfg-rel">
                {items.filter((row) => row.no !== item.no && row.g === item.g)
                  .slice(0, 6)
                  .map((row) => (
                    <button type="button" key={row.no} onClick={() => show(row.no)}>
                      <span className={`cfg-tc${row.tc.includes("SPRO") ? " is-spro" : ""}`}>
                        {row.tc.split(" / ")[0]}
                      </span>
                      <span className="cfg-rel-name">{row.item}</span>
                      <span className="cfg-rel-why">{row.sub}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="cfg-card">
              <h3>
                {t.cardRealScreen} <span className="cfg-tag">{t.tagCapture}</span>
              </h3>
              <div className="cfg-shots">
                <figure className="cfg-shot">
                  <div className="cfg-shot-ph">
                    <Icon name="image" />
                    <span>{t.noCapture}</span>
                    <b>images/{item.no}_real.png</b>
                  </div>
                </figure>
              </div>
            </section>

            <section className="cfg-card">
              <h3>
                {t.cardExampleScreen} <span className="cfg-tag">{t.tagExample}</span>
              </h3>
              <div className="cfg-shots">
                <figure className="cfg-shot">
                  <div className="cfg-shot-ph">
                    <Icon name="image" />
                    <span>{t.noCapture}</span>
                    <b>images/{item.no}_example.png</b>
                  </div>
                </figure>
              </div>
            </section>

            <section className="cfg-card">
              <h3>{t.cardNote}</h3>
              <p className="cfg-empty">{t.noNote}</p>
            </section>

            <section className="cfg-card">
              <h3>{t.cardTech}</h3>
              <dl className="cfg-kv">
                <dt>{t.kvItem}</dt>
                <dd>{item.item}</dd>
                <dt>{t.kvActivity}</dt>
                <dd className="mono">{item.act}</dd>
                <dt>{t.kvTables}</dt>
                <dd className="mono">{item.tbl}</dd>
                <dt>{t.kvImgArea}</dt>
                <dd>
                  {item.ib} › {item.im}
                </dd>
                <dt>{t.kvBusiness}</dt>
                <dd>
                  {item.g} › {item.sub}
                </dd>
                <dt>T-Code</dt>
                <dd className="mono">{item.tc}</dd>
              </dl>
            </section>
          </article>
        )}
      </main>

      {/* ---------- right: references ---------- */}
      <section className="cfg-ref" aria-label={t.references} hidden={item === null}>
        <div className="cfg-ref-head">
          <h3>{t.references}</h3>
          {item ? <span className="cfg-tag">No. {item.no}</span> : null}
          <button
            type="button"
            className="ghost cfg-ref-close"
            aria-label={t.closeReferences}
            onClick={() => setRefOpen(false)}
          >
            <Icon name="x" />
          </button>
        </div>
        {item?.verified ? (
          <p className="cfg-ref-chk">
            <Icon name="check-circle" /> {t.verifiedNote}
          </p>
        ) : null}
        <h4>{t.refCases}</h4>
        <p className="cfg-empty">{t.refPlaceholder}</p>
        <h4>{t.refCriteria}</h4>
        <p className="cfg-empty">{t.refPlaceholder}</p>
        <h4>{t.refSources}</h4>
        <p className="cfg-empty">{t.refPlaceholder}</p>
      </section>
    </div>
  );
}
