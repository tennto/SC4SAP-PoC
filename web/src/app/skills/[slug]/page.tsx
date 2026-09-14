/**
 * A skill's own screen.
 *
 * The form and the run both live in `components/SkillForm`, the client island
 * below — this file is the frame around it: the guard, the heading, and the
 * notice on a skill that cannot run. Everything that needs a socket to the
 * backend is in there.
 *
 * One route serves all of them, so a skill added to `lib/skills.ts` gets a page
 * for free.
 */
import { requireAccount } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findSkill } from "@/lib/skills";
import { readLocale, readMessages } from "@/lib/i18n/server";
import { skillDisplay } from "@/lib/i18n/skills";
import { Icon } from "@/components/Icon";
import { SkillForm } from "@/components/SkillForm";

type Params = { slug: string };

/**
 * No `generateStaticParams` any more. Every route in the app now reads the
 * session cookie — the root layout for the rail's account control, this page
 * for its own guard — so nothing here can be prerendered at build time, and
 * enumerating the slugs for a prerender that cannot happen would only be a
 * build-time error waiting to be hit.
 *
 * `lib/skills` is still the source of the catalog; it is read at request time
 * by `findSkill` below and by the rail.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const skill = findSkill((await params).slug);
  if (!skill) return { title: "SC4SAP Web PoC" };
  return { title: `${skillDisplay(await readLocale(), skill).title} · SC4SAP` };
}

/**
 * Blocks arrive in reading order rather than all at once. Delays are computed
 * rather than hardcoded because the notice only exists on a blocked skill, and
 * a fixed 220ms on the panel would leave a visible hole where the notice would
 * have been on every other page.
 */
const STEP = 110;

export default async function SkillPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Same guard as the dashboard: `proxy.ts` checks that a cookie exists,
  // this checks that it still resolves to a user before rendering.
  await requireAccount();
  const skill = findSkill((await params).slug);
  if (!skill) notFound();
  const { locale, t: messages } = await readMessages();
  const t = messages.skillPage;
  const shown = skillDisplay(locale, skill);

  // `?autorun=1&context=...` is a run the dashboard's Reconnect is sending
  // here, with what it found. Read on the server so the form mounts already
  // knowing, rather than mounting empty and then noticing. See `SkillForm`.
  const query = await searchParams;
  const context = typeof query.context === "string" ? query.context : "";
  const autorun =
    query.autorun === "1" && skill.status === "ready"
      ? { context: context.slice(0, 2000) }
      : null;

  const showsNotice = skill.status === "blocked" && Boolean(shown.blockedReason);
  const panelDelay = showsNotice ? STEP * 2 : STEP;

  return (
    // `skill` scopes this screen's own sizing: it is a form, and a form set at
    // the dashboard's scale reads as a wall of controls.
    <div className="page skill">
      <header className="page-head rise">
        <div className="skill-head">
          <span className="skill-icon">
            <Icon name={skill.icon} />
          </span>
          <div>
            <p className="eyebrow">
              <code>{skill.command}</code>
            </p>
            <h1>{shown.title}</h1>
            <p className="page-lede">{shown.summary}</p>
          </div>
        </div>

        <span className={`badge ${skill.status === "ready" ? "idle" : "closed"}`}>
          {skill.status === "ready" ? t.runnable : t.notInPoc}
        </span>
      </header>

      {showsNotice && (
        <p
          className="notice-block rise"
          style={{ "--delay": `${STEP}ms` } as React.CSSProperties}
          role="note"
        >
          <strong>{t.notRunnableHere}</strong> {shown.blockedReason}
        </p>
      )}

      <section
        className="panel rise"
        style={{ "--delay": `${panelDelay}ms` } as React.CSSProperties}
      >
        <div className="panel-head">
          <h2>{t.inputs}</h2>
          <p className="panel-note">{t.inputsNote}</p>
        </div>

        <SkillForm
          slug={skill.slug}
          command={skill.command}
          title={skill.title}
          fields={skill.fields}
          blocked={showsNotice}
          autorun={autorun}
          cost={skill.cost ?? null}
          followUp={skill.followUp === true}
        />
      </section>
    </div>
  );
}
