/**
 * A skill's own screen.
 *
 * Layout pass only: the form is rendered from the catalog's `fields` and every
 * control is inert. Nothing here posts to the backend yet — wiring a skill up
 * means giving this page a client island with a submit handler that opens a
 * session and sends the composed prompt, which is deliberately the next step
 * rather than this one.
 *
 * One route serves all of them, so a skill added to `lib/skills.ts` gets a page
 * for free.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findSkill, SKILLS, type SkillField } from "@/lib/skills";
import { Icon } from "@/components/Icon";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return SKILLS.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const skill = findSkill((await params).slug);
  return { title: skill ? `${skill.title} · SC4SAP` : "SC4SAP Web PoC" };
}

/**
 * Blocks arrive in reading order rather than all at once. Delays are computed
 * rather than hardcoded because the notice only exists on a blocked skill, and
 * a fixed 220ms on the panel would leave a visible hole where the notice would
 * have been on every other page.
 */
const STEP = 110;

/** Inert by design — see the file header. */
function Field({
  field,
  delay,
}: {
  field: SkillField;
  delay: number;
}) {
  const control = (): React.ReactNode => {
    switch (field.kind) {
      case "textarea":
        return (
          <textarea rows={4} placeholder={field.placeholder} disabled />
        );
      case "select":
        return (
          <select disabled defaultValue={field.options?.[0]}>
            {(field.options ?? []).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        );
      case "toggle":
        return (
          <span className="field-toggle">
            <input type="checkbox" disabled />
            <span>Enabled</span>
          </span>
        );
      default:
        return <input type="text" placeholder={field.placeholder} disabled />;
    }
  };

  return (
    <label
      className={`field field-${field.kind} rise-soft`}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <span className="field-label">{field.label}</span>
      {control()}
      {field.hint && <span className="field-hint">{field.hint}</span>}
    </label>
  );
}

export default async function SkillPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const skill = findSkill((await params).slug);
  if (!skill) notFound();

  const showsNotice = skill.status === "blocked" && Boolean(skill.blockedReason);
  const panelDelay = showsNotice ? STEP * 2 : STEP;

  return (
    <div className="page">
      <header className="page-head rise">
        <div className="skill-head">
          <span className="skill-icon">
            <Icon name={skill.icon} />
          </span>
          <div>
            <p className="eyebrow">
              <code>{skill.command}</code>
            </p>
            <h1>{skill.title}</h1>
            <p className="page-lede">{skill.summary}</p>
          </div>
        </div>

        <span className={`badge ${skill.status === "ready" ? "idle" : "closed"}`}>
          {skill.status === "ready" ? "runnable" : "not in PoC"}
        </span>
      </header>

      {showsNotice && (
        <p
          className="notice-block rise"
          style={{ "--delay": `${STEP}ms` } as React.CSSProperties}
          role="note"
        >
          <strong>Not runnable here.</strong> {skill.blockedReason}
        </p>
      )}

      <section
        className="panel rise"
        style={{ "--delay": `${panelDelay}ms` } as React.CSSProperties}
      >
        <div className="panel-head">
          <h2>Inputs</h2>
          <p className="panel-note">
            Layout only — these controls are not wired to the backend yet.
          </p>
        </div>

        {skill.fields.length === 0 ? (
          <p className="panel-empty">
            This skill takes no input. It runs against the connected system as
            configured.
          </p>
        ) : (
          <div className="fields">
            {skill.fields.map((field, index) => (
              <Field
                key={field.label}
                field={field}
                // Inside the panel, so they start after it and run tighter —
                // a form that takes a second to assemble itself is a form you
                // are waiting on rather than filling in.
                delay={panelDelay + 90 + index * 45}
              />
            ))}
          </div>
        )}

        <div
          className="panel-actions rise-soft"
          style={
            {
              "--delay": `${panelDelay + 90 + skill.fields.length * 45}ms`,
            } as React.CSSProperties
          }
        >
          <button className="primary" disabled>
            Run
          </button>
          <Link className="link-button" href="/chat">
            Or ask it in chat
          </Link>
        </div>
      </section>
    </div>
  );
}
