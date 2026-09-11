/**
 * ABAP and CDS syntax highlighting for the transcript.
 *
 * The grammars are the TextMate ones the VS Code extensions ship — larshp's
 * for ABAP, FreHu's for CDS — run through Shiki, which is what VS Code itself
 * tokenises with. They live in `grammars/` with their licences; refresh them
 * with `npm run grammars:refresh`.
 *
 * Three choices worth stating, because each has a cheaper-looking alternative:
 *
 * `shiki/core` rather than `shiki`
 *   The default entry point carries every bundled language and theme. Nothing
 *   here needs Rust or Solarized, and importing the bundle would ship all of
 *   it to the browser.
 *
 * The JavaScript regex engine rather than Oniguruma
 *   Shiki's default engine is Oniguruma compiled to WebAssembly, ~625 KB.
 *   Its JS engine reads the same grammars with the platform's own RegExp.
 *   That is only safe if the grammars avoid the Oniguruma-only syntax, which
 *   is not a promise anyone made — so it was checked: on the samples in the
 *   comparison, both engines produced byte-identical HTML. `forgiving` keeps
 *   a pattern the engine cannot translate from throwing; it degrades that one
 *   rule instead of the whole block.
 *
 * Both themes at once, with no default colour
 *   `defaultColor: false` makes Shiki emit `--shiki-light` and `--shiki-dark`
 *   on each span and no `color`, so one render serves both themes and the CSS
 *   picks. The app's theme has three states — light, dark, and the unstamped
 *   "follow the system" that most readers are in — and a baked-in colour can
 *   only serve one of them.
 */
import type { HighlighterCore } from "shiki/core";

/** Fence tags that mean ABAP, lower-cased. */
const ABAP_TAGS = new Set(["abap"]);

/** Fence tags that mean ABAP CDS. `cds` alone is the one people actually type. */
const CDS_TAGS = new Set(["cds", "abapcds", "abap-cds", "ddl"]);

export type HighlightLang = "abap" | "abapcds";

/** The language a fence tag selects, or null to leave the block alone. */
export function langFor(tag: string | undefined): HighlightLang | null {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (ABAP_TAGS.has(t)) return "abap";
  if (CDS_TAGS.has(t)) return "abapcds";
  return null;
}

/**
 * One highlighter for the whole app.
 *
 * Module-level so that a transcript with thirty code blocks builds one, and
 * a promise rather than an instance because construction is async and every
 * caller should wait on the same one. A failure is cached too — deliberately:
 * if the chunk will not load, retrying once per code block per render turns
 * one failure into a storm of them, and the fallback is plain text either way.
 */
let started: Promise<HighlighterCore | null> | undefined;

export function highlighter(): Promise<HighlighterCore | null> {
  if (!started) {
    started = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, abap, cds] =
        await Promise.all([
          import("shiki/core"),
          import("@shikijs/engine-javascript"),
          import("./grammars/abap.tmLanguage.json"),
          import("./grammars/cds.tmLanguage.json"),
        ]);

      return createHighlighterCore({
        themes: [
          import("@shikijs/themes/github-light"),
          import("@shikijs/themes/github-dark"),
        ],
        // The grammars carry `scopeName`, not the short name Shiki selects on,
        // so the name is attached here. `as never` because the JSON imports are
        // typed structurally and Shiki wants its own `LanguageRegistration`.
        langs: [
          { ...(abap.default ?? abap), name: "abap" } as never,
          { ...(cds.default ?? cds), name: "abapcds" } as never,
        ],
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      });
    })().catch(() => null);
  }
  return started;
}

/** `<pre class="shiki">…` for one block, or null if the highlighter is not up. */
export function highlight(
  hl: HighlighterCore | null,
  code: string,
  lang: HighlightLang,
): string | null {
  if (!hl) return null;
  try {
    return hl.codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    });
  } catch {
    // A grammar can throw on input it cannot tokenise. One unhighlighted block
    // is a much smaller problem than a transcript that stops rendering.
    return null;
  }
}
