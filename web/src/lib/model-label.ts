/**
 * A model id as the reader sees it: the family, without the version.
 *
 * `claude-sonnet-5` and `claude-sonnet-4-6` both read `Sonnet`,
 * `claude-haiku-4-5-20251001` reads `Haiku`. The plugin now resolves each
 * family to its newest model by itself, so the number on screen stopped
 * meaning which model runs — only the family is a choice the reader makes.
 * Ids this does not recognise are shown as they are.
 */
export function modelLabel(model: string): string {
  const family = /^claude-([a-z]+)/i.exec(model)?.[1];
  if (!family) return model;
  return family.charAt(0).toUpperCase() + family.slice(1).toLowerCase();
}
