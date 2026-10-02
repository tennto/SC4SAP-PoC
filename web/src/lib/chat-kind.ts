/**
 * Whether a conversation was a chat or a skill run, for rows that never said.
 *
 * Rows saved since 2026-10-02 carry `kind`. Older ones, and live sessions
 * nobody has saved yet, are read off their title: a skill run is saved as
 * "<Skill>" or "<Skill> · <target>" (`runTitle` in SkillForm), and a live one
 * is named after the slash command it began with — "/sc4sap:…", or the
 * backend's tidied "Program To Spec object=…". A chat is named after its first
 * prompt, which almost never has any of those shapes.
 */
import { SKILLS } from "@/lib/skills";

const SKILL_TITLES = SKILLS.map((skill) => skill.title);

export function inferKind(title: string | null | undefined): "chat" | "task" {
  if (!title) return "chat";
  if (title.startsWith("/")) return "task";
  if (SKILL_TITLES.some((name) => title === name || title.startsWith(`${name} · `))) {
    return "task";
  }
  // `key=value` arguments, the way a skill's slash command is written.
  if (/\b[a-z]+=\S/.test(title) && /^[A-Z]/.test(title)) return "task";
  return "chat";
}
