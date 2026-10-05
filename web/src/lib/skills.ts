/**
 * The skill catalog that drives the left navigation and the per-skill pages.
 *
 * Mirrors the plugin repo's `skills/<name>/SKILL.md` set, minus `trust-session`,
 * which is an internal permission bootstrap that rejects direct invocation and
 * therefore has no user-facing screen.
 *
 * `fields` describes the form a skill's page will eventually render. This pass
 * builds the screens only — the fields are declared here so every page has a
 * real shape to lay out, and so wiring one up later is a matter of giving it a
 * submit handler rather than designing it from scratch.
 *
 * `status` reflects what the PoC backend can actually run today:
 *   - `ready`   — read-class only, allowed by `server/tool-policy.ts`
 *   - `blocked` — needs write-class SAP tools, agent teams, or local config
 *                 writes, none of which this PoC exposes. Listed anyway, so the
 *                 menu shows the whole product rather than a filtered subset.
 */

export type SkillStatus = "ready" | "blocked";

export type SkillGroupId = "analyze" | "build" | "system";

export type SkillFieldKind = "text" | "textarea" | "select" | "toggle";

export type SkillField = {
  label: string;
  kind: SkillFieldKind;
  placeholder?: string;
  options?: string[];
  hint?: string;
  /**
   * A select's hint per option, shown instead of `hint` for the option that
   * is chosen — so the line under the field explains the answer on screen
   * rather than every answer at once.
   */
  optionHints?: Record<string, string>;
  /**
   * Lays the form out in rows of its own: `half` fields share the first row,
   * and the first `third` field after them starts a new row that the rest
   * follow. Without it the form is the usual auto-fitted grid.
   */
  span?: "half" | "third";
  /**
   * The field also takes screenshots — dropped, pasted or picked — which go
   * to the model as images alongside the text. A dump or a job log is a
   * screen far more often than it is a string someone can retype.
   */
  images?: boolean;
};

/**
 * What a skill's session may reach for. Mirrors `ToolProfile` in
 * `src/server/tool-policy.ts`, and is declared per skill rather than derived
 * from `group`, which is a shelf in the sidebar and would silently regrant
 * permissions the day someone re-shelves something.
 *
 *   analyse — dispatches specialists, looks things up, reads the local cache,
 *             and changes nothing. No shell, no file writes.
 *   build   — writes its artifacts down and runs commands.
 */
export type SkillTools = "analyse" | "build";

export type Skill = {
  /** Route segment: `/skills/<slug>`. */
  slug: string;
  /** The slash command this page stands in for. */
  command: string;
  title: string;
  /**
   * Phosphor icon name, without the `ph-` prefix — the same library the
   * sc4sap.dev site uses. It is the only thing left of an entry once the rail
   * is collapsed, so it has to carry the meaning on its own.
   */
  icon: string;
  summary: string;
  group: SkillGroupId;
  /**
   * Required, not defaulted. A skill that does not say what it needs gets the
   * benefit of the doubt nowhere: the compiler asks, and whoever adds the next
   * one has to answer.
   */
  tools: SkillTools;
  /**
   * How hard the run thinks. Absent leaves the model's default, which is
   * `high`. Set where a measurement showed thinking was most of the bill.
   */
  effort?: "low" | "medium" | "high";
  status: SkillStatus;
  /** Why it cannot run yet. Required when `status` is `blocked`. */
  blockedReason?: string;
  fields: SkillField[];
  /**
   * The run is worth a word before it starts.
   *
   * Set on a skill that dispatches a heavier reviewer — one whose single
   * press can cost dollars rather than cents. The screen puts up a dialog
   * with `note`, a budget ceiling the backend enforces, and the switch that
   * keeps sub-agents on Sonnet. Absent on skills cheap enough to just run.
   */
  cost?: {
    note: string;
    defaultBudgetUsd: number;
    /**
     * Which model the dialog opens on.
     *
     * Stated per skill rather than taken from the first entry of the picker's
     * list, which is how it worked until Haiku was added to that list and
     * silently became every skill's default. A default that moves when someone
     * reorders an array is not a default, it is an accident.
     */
    defaultModel: string;
    /**
     * The main thread's model, where the skill's own `SKILL.md` pins one.
     *
     * The session opens on it whatever the dialog says, and the dialog's
     * choice decides only the sub-agents. Opening anywhere else paid for a
     * cache write and then switched to the pin: on 2026-09-27 a Haiku choice
     * made Analyze Code cost more, not less.
     */
    pinnedModel?: string;
    /**
     * Offer the budget field. Absent or true shows it; false runs without a
     * ceiling and does not ask.
     */
    budget?: boolean;
    /**
     * The dialog's model is what every plugin sub-agent runs on — Haiku,
     * Sonnet or Opus — rather than only Opus-or-not. Set where the skill's
     * cost is its sub-agent, as a code review's is its reviewer.
     */
    subagentPicker?: boolean;
  };
  /**
   * The form has a Mode field, Economy or Standard, and Economy is built by
   * this app rather than being the plugin's skill. `code-review`: one agent
   * reads the source and applies the reviewer's rule files, which the
   * backend puts in front of its prompt — see `code-review-prompt.ts`.
   * Economy runs without the cost dialog; Standard is the plugin's skill.
   */
  economyMode?: "code-review";
  /**
   * The skill answers in rounds and asks back.
   *
   * Its report ends with questions, and the reply goes to the same session
   * — so the screen keeps a composer under the result for as long as the
   * run is open, instead of sending the reader to chat to answer.
   */
  followUp?: boolean;
  /**
   * The run writes documents for the reader to take away, and keeps nothing.
   *
   * The page collects the files when the run settles (the backend hands them
   * over once and deletes them), shows them, and offers them for download.
   * Nothing of the run is remembered: not in this tab's storage, not as a
   * conversation — only its cost is recorded. Done, a reload or closing the
   * tab ends it, and the backend session with it.
   *
   * Which documents: `spec` is Program → Spec (`spec-prompt.ts`, its survey
   * dialog in Standard mode), `manual` is Program → Manual (`manual-prompt.ts`,
   * a cover dialog in both modes, the manual previewed with its edit mode),
   * `cbo` is Inventory a CBO Package (`cbo-prompt.ts`, its index previewed
   * as HTML in the spec's look, with inventory.json beside it).
   * `process` is Package → Process (`process-prompt.ts`: the process document
   * and the BPML, in the spec's look with the diagrams drawn by
   * `process-diagrams.ts`, and the BPML workbook).
   */
  documents?: "spec" | "manual" | "cbo" | "process";
};

export type SkillGroup = {
  id: SkillGroupId;
  label: string;
  /** Rendered under the group heading in the expanded rail. */
  hint: string;
};

export const SKILL_GROUPS: SkillGroup[] = [
  // The three that were under Document — turning source into a spec, a
  // process or an interview — live here too. They are all reading the system
  // and answering a question about it; what differs is the length of the
  // answer, which is not a reason for a menu of its own.
  { id: "analyze", label: "Analyze", hint: "Read the system, answer questions" },
  { id: "build", label: "Build", hint: "Create and transport objects" },
  { id: "system", label: "System", hint: "Diagnostics and the MCP server" },
];

/** Shared across every consultant-routed skill. */
const MODULES = [
  "Auto-route",
  "SD",
  "MM",
  "FI",
  "CO",
  "PP",
  "PS",
  "PM",
  "QM",
  "TR",
  "HCM",
  "WM",
  "TM",
  "BW",
  "Ariba",
  "BC",
];

const WRITE_BLOCKED =
  "Needs write-class SAP tools. The PoC backend removes Create/Update/Delete from the model's context entirely (server/tool-policy.ts).";

export const SKILLS: Skill[] = [
  // ---------- analyze ----------
  {
    slug: "ask-consultant",
    command: "/sc4sap:ask-consultant",
    tools: "analyse",
    title: "Ask a Consultant",
    icon: "chat-teardrop-text",
    summary:
      "Operational Q&A routed to the matching module consultant, answered against the configured SAP environment",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Module", kind: "select", options: MODULES, hint: "Auto-route picks the agent from your question's keywords." },
      { label: "Question", kind: "textarea", placeholder: "e.g. Why does the PO release strategy skip the second approver?" },
    ],
    cost: {
      note: "The question is answered by the plugin's module consultant; the orchestrator routes it and checks the answer. The choice here is the orchestrator's model, and since plugin 0.6.24 this skill follows it. The consultant runs on Opus when Opus is chosen and on Sonnet otherwise. Measured on 2026-09-27, a one-sentence answer cost $0.43, of which $0.28 was the session opening on Sonnet and then switching away to the skill's pinned Haiku.",
      defaultBudgetUsd: 1,
      // Haiku because the orchestrator here routes and relays: the reasoning
      // is the consultant's. The skill used to pin Haiku itself, so a session
      // opened on anything else paid a cache write for nothing; with the pin
      // now `inherit`, opening on Haiku keeps the whole main thread on it.
      defaultModel: "claude-haiku-4-5",
    },
    // A consultant's answer invites the next question, and asking it here
    // keeps the module routing and the context the first one built.
    followUp: true,
  },
  {
    slug: "analyze-code",
    command: "/sc4sap:analyze-code",
    // `analyse`, not `build`: a review changes nothing. Measured on
    // 2026-09-27 against ZMMR00020 under `build`, the reviewer could not
    // resolve its rule files, ran `find` across the home directory for 22
    // seconds, then read twelve of them with `Bash cat` from a different copy
    // of the plugin than the one this app ships — `Read` had been refused
    // outside the workspace, and the shell simply went around it.
    tools: "analyse",
    // Measured on 2026-09-27: of the reviewer's 14.5k output tokens about
    // 11k were thinking, and that thinking was most of both the $0.90 it
    // cost and the three minutes it took.
    effort: "medium",
    title: "Analyze Code",
    icon: "code",
    summary:
      "Static review of an ABAP object — AST, semantic analysis and where-used, run through sap-code-reviewer",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Object type", kind: "select", options: ["Program", "Class", "Function Module", "Include", "Interface"] },
      // Optional, and narrowing rather than required: an object name is unique
      // on the system, so this is worth giving when the name is ambiguous or
      // the review should read the neighbours around it.
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", hint: "Optional. Narrows the search and gives the review the surrounding objects." },
      { label: "Object name", kind: "text", placeholder: "ZPROGRAM" },
      { label: "Review focus", kind: "select", options: ["All", "Clean ABAP", "Performance", "Security", "SAP standard compliance"] },
      {
        label: "Mode",
        kind: "select",
        // Economy first and default, as on Program → Spec.
        options: ["Economy", "Standard"],
        optionHints: {
          Economy:
            "One agent reads the source and applies the reviewer's rule files. Estimated cost: about $0.18–0.25. Estimated time: 1–2 min.",
          Standard:
            "The plugin's skill with its code reviewer agent. Estimated cost: about $0.35–0.70. Estimated time: about 2 min. Asks for the reviewer's model first.",
        },
      },
      // Asked, not guessed from the screen: a Korean reader on an English
      // screen got an English review, and the other way round.
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese"] },
    ],
    economyMode: "code-review",
    cost: {
      note: "The review is dispatched to the plugin's code reviewer, which reads the source and the rule files and writes the findings; the main run, on Sonnet, only formats them. The choice here is the reviewer's model: Haiku for the cheapest pass, Sonnet by default, or Opus for the reviewer the plugin asks for. There is no spending ceiling.",
      defaultBudgetUsd: 0,
      budget: false,
      subagentPicker: true,
      // The reviewer on Sonnet: $0.50 of a $0.69 run was the reviewer on Opus
      // (2026-09-27), and Opus stays one choice away.
      defaultModel: "claude-sonnet-5",
      pinnedModel: "claude-sonnet-5",
    },
    // The report ends on a menu — explain finding #N, show the callers — and
    // the reply goes to the same session, where the reviewer's findings are
    // already in context. Starting over in chat would pay for them again.
    followUp: true,
  },
  {
    slug: "analyze-symptom",
    command: "/sc4sap:analyze-symptom",
    tools: "analyse",
    title: "Analyze a Symptom",
    icon: "bug",
    summary:
      "Root-cause analysis for a dump, error or slowdown — inspects dumps, transports and where-used, then narrows hypotheses",
    group: "analyze",
    status: "ready",
    // The skill's own intake, in the skill's own words: the exact error, then
    // where it happens, then how it reproduces — and it asks for whatever is
    // missing, up to three questions a round, each round a reviewer dispatch.
    // So the form asks for the three up front. A screenshot carries the
    // first; the other two are not on any screen.
    fields: [
      {
        label: "Symptom type",
        kind: "select",
        // "Unknown" last: for a fault that is none of the named shapes — no
        // dump, no message, no failed job — and the run has to find the shape
        // before it can find the cause.
        options: ["Short dump", "Error message", "Wrong result", "Performance", "Transport failure", "Unknown"],
        hint: "Performance: profiling runs are not allowed from this app, so the analysis works from dumps, transports and code.",
      },
      {
        label: "Where it happened",
        kind: "text",
        placeholder: "VA01 · ZSD_ORDER_REPORT · job ZBILL_RUN",
        hint: "Transaction, program, job or app. Optional when the screenshot shows it.",
      },
      {
        label: "How often",
        kind: "select",
        // "Not sure" first and default: an honest answer that leaves the
        // reviewer to ask, rather than a guess it would build on.
        options: [
          "Not sure",
          "Every time",
          "Intermittent",
          "Only some users or data",
          "Since a recent change",
          "First time",
        ],
        hint: "Which of the eight cause categories the analysis leans toward starts here.",
      },
      {
        label: "Since when",
        kind: "text",
        placeholder: "Yesterday · after the SP upgrade · not known",
        hint: "Sets the window for the transport search.",
      },
      {
        label: "What you observed",
        kind: "textarea",
        placeholder: "The dump or message, what was being done, what changed recently.",
        hint: "Paste or drop a screenshot of the dump or job log — the image goes to the analysis with your notes.",
        images: true,
      },
    ],
    cost: {
      note: "Each round dispatches a debugger agent against the SAP system — dumps, transports, code; the main run stays on Sonnet, which the skill pins. A short dump is triaged on Sonnet, and when the dump alone cannot explain the failure the skill escalates to Opus by itself. The choice here decides whether it may: on Sonnet the escalation also runs on Sonnet, on Opus it goes to Opus.",
      defaultBudgetUsd: 3,
      // Was Haiku, on a report judged as good as Sonnet's. That run was very
      // likely Sonnet all along: the skill pins `model: sonnet`, and no
      // `modelUsage` was kept to say otherwise. Sonnet now, stated plainly.
      defaultModel: "claude-sonnet-5",
      pinnedModel: "claude-sonnet-5",
    },
    followUp: true,
  },
  {
    // Built out on 2026-10-04. The plugin asks package, flagship programs and
    // module one at a time and writes .sc4sap/cbo/<MODULE>/<PACKAGE>/; here
    // the three are form fields and the files go to the run's own folder, to
    // be shown and downloaded like a spec's — nothing is kept on the server.
    // Measured 2026-10-04 on ZMMPAEK (362 objects, flagship ZMMR00020), after
    // the app scripts took over the object list and the object table: Economy
    // 190 s, $0.95; Standard 437 s, $1.63 with every section of the stocker's
    // analysis kept; no dialogs (before: 255 s / $1.56 and 466 s / $2.39).
    slug: "analyze-cbo-obj",
    command: "/sc4sap:analyze-cbo-obj",
    tools: "build",
    title: "Inventory a CBO Package",
    icon: "package",
    summary:
      "Walks a custom package and catalogs the Z objects worth reusing, so later runs prefer existing elements over new ones",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", span: "half" },
      {
        label: "Flagship programs",
        kind: "text",
        placeholder: "ZPROGRAM1, ZPROGRAM2",
        hint: "Optional. The programs used most; what they use is pinned to the top.",
        span: "half",
      },
      {
        label: "Mode",
        kind: "select",
        span: "third",
        options: ["Economy", "Standard"],
        optionHints: {
          Economy:
            "One agent walks the package and its where-used graph and describes the objects that matter. Estimated cost: about $0.80–1.20. Estimated time: 2–4 min.",
          Standard:
            "The plugin's skill with its stocker agent; it flags sensitive objects more thoroughly. Estimated cost: about $1.40–2.00. Estimated time: 6–8 min.",
        },
      },
      { label: "Module", kind: "select", options: MODULES.slice(1), span: "third" },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese"], span: "third" },
    ],
    documents: "cbo",
  },
  {
    // Not yet worked on for model choice: no cost dialog, so no budget and no
    // economy, and its Opus agents run unchecked. Add both when this skill is
    // next developed — see docs/model-selection-improvements.md, item 4.
    slug: "compare-programs",
    command: "/sc4sap:compare-programs",
    tools: "build",
    title: "Compare Programs",
    icon: "git-diff",
    summary:
      "Side-by-side business comparison of 2–5 programs that share a scenario but diverge by module, country or persona",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Programs", kind: "textarea", placeholder: "One per line — 2 to 5 of them.", hint: "They should share a business scenario; the divergence is the point." },
      { label: "Comparison axis", kind: "select", options: ["Module", "Country / localization", "Persona", "Time horizon"] },
      { label: "Reader", kind: "select", options: ["Functional consultant", "Developer", "Business owner"] },
      // The skill's Step 2 choice, in its own words: Markdown by default,
      // `html` adds a single-file copy, `html only` keeps just that.
      { label: "Output", kind: "select", options: ["Markdown", "Markdown + HTML", "HTML only"], hint: "HTML is one self-contained file — share, mail, print." },
    ],
  },

  // ---------- document ----------
  {
    slug: "program-to-spec",
    command: "/sc4sap:program-to-spec",
    tools: "build",
    title: "Program → Spec",
    icon: "file-text",
    summary:
      "Reverse-engineers a program into a functional or technical specification, with selection-screen and ALV mockups",
    group: "analyze",
    status: "ready",
    // What to document, what to get back, and how. Economy starts at once
    // with fixed answers; Standard is the plugin's own skill and asks the rest
    // of its interview (detail, audience, language) in a dialog when Run is
    // pressed (`SpecSurveyModal`), so nothing is asked mid-run. See
    // `lib/spec-prompt.ts`.
    fields: [
      // Two rows: what to document, then how — mode, files, language.
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", hint: "Optional. Helps find the program and its custom objects.", span: "half" },
      { label: "Program name", kind: "text", placeholder: "ZPROGRAM", span: "half" },
      // Excel on its own: the workbook carries the whole spec.
      {
        label: "Mode",
        kind: "select",
        span: "third",
        // Economy first and default: the target is a run under ₩500, and the
        // plugin's full skill measured ~₩1,600 on ZMMR00020 (2026-09-28).
        options: ["Economy", "Standard"],
        optionHints: {
          Economy: "One agent. Estimated cost: about $0.15–0.30. Estimated time: 1–3 min.",
          Standard:
            "The plugin's full skill, with an analyst agent. Estimated cost: about $0.70–1.15. Estimated time: 5–10 min. Asks about detail and audience first.",
        },
      },
      {
        label: "Output format",
        kind: "select",
        span: "third",
        options: ["Markdown", "HTML", "Markdown + HTML", "Excel (xlsx)"],
        optionHints: {
          Markdown: "Shown here as the document, saved as .md.",
          HTML: "Previewed here as it will look, saved as .html.",
          "Markdown + HTML": "The document here and an HTML preview under it, saved as either.",
          "Excel (xlsx)": "A workbook, offered as a file to download.",
        },
      },
      // On the form rather than in the dialog, so Economy — which asks
      // nothing — writes in the language chosen, not the screen's.
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese"], span: "third" },
    ],
    documents: "spec",
  },
  {
    // The plugin's newest document skill (0.6.31): one HTML file a key user
    // follows, with an edit mode inside it. Economy measured on 2026-10-03
    // against ZMMR00020 (Korean, no English copy): 87 s, $0.56, 15 turns, no
    // approval dialogs. Standard is not measured yet; its hint is an estimate.
    slug: "program-to-manual",
    command: "/sc4sap:program-to-manual",
    tools: "build",
    title: "Program → Manual",
    icon: "book-open-text",
    summary:
      "Writes the end-user manual for one program — scenario steps on drawn screens with numbered callouts, check points, messages and a glossary, editable in the page",
    group: "analyze",
    status: "ready",
    // The same two rows as Program → Spec. No output format: the manual is
    // one HTML file. The cover — author, team, company, confidentiality — is
    // asked in a dialog when Run is pressed (`ManualSurveyModal`).
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", hint: "Optional. Helps find the program and its custom objects.", span: "half" },
      { label: "Program name", kind: "text", placeholder: "ZPROGRAM", span: "half" },
      {
        label: "Mode",
        kind: "select",
        span: "third",
        options: ["Economy", "Standard"],
        optionHints: {
          Economy:
            "One agent reads the program and its screens and writes the manual. Estimated cost: about $0.50–0.80. Estimated time: 1–3 min.",
          Standard:
            "The plugin's full skill: an analyst and a module consultant, then a writer. Estimated cost: about $1.50–3.00. Estimated time: 10–20 min.",
        },
      },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese"], span: "third" },
      {
        label: "English copy",
        kind: "select",
        span: "third",
        // No first: a second manual is a second writer pass, close to the
        // cost of the first one's writing again.
        options: ["No", "Yes"],
        optionHints: {
          No: "One manual, in the language chosen.",
          Yes: "An English manual as well, translated from the first. Adds about a third to the cost. Ignored for an English manual.",
        },
      },
    ],
    documents: "manual",
  },
  {
    // Built out on 2026-10-05, as the other document skills: the plugin's
    // intake and its two mid-run confirmations (entry points, process groups)
    // become form fields and "as proposed", the files go to the run's own
    // folder to be shown and downloaded. Economy is one agent writing one
    // process.json that this app's scripts turn into every file
    // (`scripts/process/`); Standard is the plugin's skill. See
    // `lib/process-prompt.ts`.
    slug: "package-to-process",
    command: "/sc4sap:package-to-process",
    tools: "build",
    title: "Package → Process",
    icon: "flow-arrow",
    summary:
      "Turns a CBO package into an end-to-end business process document with flowcharts, sequence diagrams and step tables, and its BPML",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", span: "half" },
      {
        label: "Entry programs",
        kind: "text",
        placeholder: "ZPROGRAM1, ZPROGRAM2",
        hint: "Optional. Programs a process starts from, beside the ones its transactions start.",
        span: "half",
      },
      {
        label: "Mode",
        kind: "select",
        span: "third",
        options: ["Economy", "Standard"],
        optionHints: {
          Economy:
            "One agent groups the programs into processes from a scan of their sources; this app lays out the document and the BPML. Estimated cost: about $0.80–1.50. Estimated time: 4–7 min.",
          Standard:
            "The plugin's analyst groups and narrates every process in full from a scan of the sources, interfaces included; this app lays out the document and the BPML. Estimated cost: about $3–6. Estimated time: 20–30 min.",
        },
      },
      // The process document comes as Markdown or HTML; Excel is the BPML
      // workbook. Every BPML format chosen is made too, as in the plugin.
      {
        label: "Output format",
        kind: "select",
        span: "third",
        options: ["HTML + Excel (xlsx)", "HTML", "Markdown", "Markdown + HTML", "Excel (xlsx)", "Markdown + HTML + Excel (xlsx)"],
        optionHints: {
          "HTML + Excel (xlsx)": "The process document and the BPML previewed here, and the BPML workbook to download.",
          HTML: "The process document and the BPML previewed here, saved as .html.",
          Markdown: "The process document shown here, the BPML as a Markdown file.",
          "Markdown + HTML": "The document here as Markdown and as HTML previews, saved as either.",
          "Excel (xlsx)": "The BPML workbook to download; the process document comes as Markdown.",
          "Markdown + HTML + Excel (xlsx)": "Everything: Markdown, HTML previews and the BPML workbook.",
        },
      },
      { label: "Module", kind: "select", options: MODULES.slice(1), span: "third" },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese"], span: "third" },
    ],
    documents: "process",
  },

  // ---------- build ----------
  {
    slug: "create-program",
    command: "/sc4sap:create-program",
    tools: "build",
    title: "Create a Program",
    icon: "file-plus",
    summary:
      "Full Phase 0–8 pipeline: Report / CRUD / ALV / Batch, Main+Include structure, OOP or procedural, with a QA pass",
    group: "build",
    status: "blocked",
    blockedReason: WRITE_BLOCKED,
    fields: [
      { label: "Program type", kind: "select", options: ["Report", "CRUD", "ALV", "Batch"] },
      { label: "Paradigm", kind: "select", options: ["OOP", "Procedural"] },
      { label: "Package", kind: "text", placeholder: "ZMM_CBO" },
      { label: "Transport", kind: "text", placeholder: "Existing request, or leave blank to create one" },
      { label: "Execution mode", kind: "select", options: ["Auto", "Manual", "Hybrid"] },
      { label: "Requirement", kind: "textarea", placeholder: "What the program has to do." },
    ],
  },
  {
    slug: "create-object",
    command: "/sc4sap:create-object",
    tools: "build",
    title: "Create an Object",
    icon: "cube",
    summary:
      "Single-object creation — confirm transport and package, create, activate",
    group: "build",
    status: "blocked",
    blockedReason: WRITE_BLOCKED,
    fields: [
      { label: "Object type", kind: "select", options: ["Class", "Interface", "Function Module", "Table", "Structure", "Data Element", "Domain", "CDS View"] },
      { label: "Object name", kind: "text", placeholder: "ZCL_MM_PO_HANDLER" },
      { label: "Package", kind: "text", placeholder: "ZMM_CBO" },
      { label: "Transport", kind: "text", placeholder: "Existing request, or blank to create one" },
    ],
  },
  // No `team` here. It was built on Claude Code's native agent teams, which
  // the Agent SDK does not expose, and it has been retired rather than
  // rebuilt on SDK subagents. The heavier skills above dispatch their own
  // reviewers already.

  // ---------- system ----------
  {
    slug: "sap-doctor",
    command: "/sc4sap:sap-doctor",
    tools: "build",
    title: "SAP Doctor",
    icon: "stethoscope",
    summary:
      "Diagnoses plugin health, MCP server connectivity and the SAP connection itself",
    group: "system",
    status: "ready",
    fields: [],
  },
  // No `sap-option` here any more. What that skill edits — the connection,
  // the industry, the blocklist profile and its allowed tables — is what
  // `/settings` holds for this account; the CLI-only parts (profile aliases,
  // HUD usage limits) have no meaning in an app that has an account per
  // person. The status snapshot it also drew belongs to the dashboard.
  // No `mcp-setup` either. It was an install guide for the MCP server on a
  // developer's own machine; under the web app the server is already running
  // on the backend. What replaced it is the Monitor page, which is not a
  // skill and lives in `SkillNav`'s `PAGES`.
];

export const SKILLS_BY_GROUP: { group: SkillGroup; skills: Skill[] }[] =
  SKILL_GROUPS.map((group) => ({
    group,
    skills: SKILLS.filter((skill) => skill.group === group.id),
  }));

export function findSkill(slug: string): Skill | undefined {
  return SKILLS.find((skill) => skill.slug === slug);
}
