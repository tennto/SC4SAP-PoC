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
   * The field also takes screenshots — dropped, pasted or picked — which go
   * to the model as images alongside the text. A dump or a job log is a
   * screen far more often than it is a string someone can retype.
   */
  images?: boolean;
};

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
  };
  /**
   * The skill answers in rounds and asks back.
   *
   * Its report ends with questions, and the reply goes to the same session
   * — so the screen keeps a composer under the result for as long as the
   * run is open, instead of sending the reader to chat to answer.
   */
  followUp?: boolean;
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
    title: "Ask a Consultant",
    icon: "chat-teardrop-text",
    summary:
      "Operational Q&A routed to the matching module consultant, answered against the configured SAP environment.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Module", kind: "select", options: MODULES, hint: "Auto-route picks the agent from your question's keywords." },
      { label: "Question", kind: "textarea", placeholder: "e.g. Why does the PO release strategy skip the second approver?" },
    ],
  },
  {
    slug: "analyze-code",
    command: "/sc4sap:analyze-code",
    title: "Analyze Code",
    icon: "code",
    summary:
      "Static review of an ABAP object — AST, semantic analysis and where-used, run through sap-code-reviewer.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Object type", kind: "select", options: ["Program", "Class", "Function Module", "Include", "Interface"] },
      // Optional, and narrowing rather than required: an object name is unique
      // on the system, so this is worth giving when the name is ambiguous or
      // the review should read the neighbours around it.
      { label: "Package", kind: "text", placeholder: "ZMM_CBO", hint: "Optional. Narrows the search and gives the review the surrounding objects." },
      { label: "Object name", kind: "text", placeholder: "ZMM_PO_REPORT" },
      { label: "Review focus", kind: "select", options: ["All", "Clean ABAP", "Performance", "Security", "SAP standard compliance"] },
    ],
  },
  {
    slug: "analyze-symptom",
    command: "/sc4sap:analyze-symptom",
    title: "Analyze a Symptom",
    icon: "bug",
    summary:
      "Root-cause analysis for a dump, error or slowdown — inspects dumps, transports and where-used, then narrows hypotheses.",
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
        placeholder: "VA01 · ZSD_ORDER_REPORT · job ZBILLING_RUN · a Fiori app",
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
        placeholder: "Yesterday afternoon · after the SP upgrade · not known",
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
      note: "Each round dispatches a reviewer agent against the SAP system — dumps, transports, code. On Opus, as the skill asks, a round is a few dollars; on Sonnet it is a fraction of that.",
      defaultBudgetUsd: 3,
    },
    followUp: true,
  },
  {
    slug: "analyze-cbo-obj",
    command: "/sc4sap:analyze-cbo-obj",
    title: "Inventory a CBO Package",
    icon: "package",
    summary:
      "Walks a custom package and catalogs the Z objects worth reusing, so later runs prefer existing elements over new ones.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO" },
      { label: "Module", kind: "select", options: MODULES.slice(1) },
      { label: "Save the inventory to .sc4sap/cbo/", kind: "toggle", hint: "Makes the result reusable by create-program and program-to-spec." },
    ],
  },
  {
    slug: "compare-programs",
    command: "/sc4sap:compare-programs",
    title: "Compare Programs",
    icon: "git-diff",
    summary:
      "Side-by-side business comparison of 2–5 programs that share a scenario but diverge by module, country or persona.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Programs", kind: "textarea", placeholder: "One per line — 2 to 5 of them.", hint: "They should share a business scenario; the divergence is the point." },
      { label: "Comparison axis", kind: "select", options: ["Module", "Country / localization", "Persona", "Time horizon"] },
      { label: "Reader", kind: "select", options: ["Functional consultant", "Developer", "Business owner"] },
    ],
  },

  // ---------- document ----------
  {
    slug: "program-to-spec",
    command: "/sc4sap:program-to-spec",
    title: "Program → Spec",
    icon: "file-text",
    summary:
      "Reverse-engineers a program into a functional or technical specification, with selection-screen and ALV mockups.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Program name", kind: "text", placeholder: "ZPP0050" },
      { label: "Output format", kind: "select", options: ["Markdown", "Excel (xlsx)"] },
      { label: "Scope", kind: "select", options: ["Everything", "Selection screen only", "Business logic only", "Interfaces only"] },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese", "German"] },
    ],
  },
  {
    slug: "package-to-process",
    command: "/sc4sap:package-to-process",
    title: "Package → Process",
    icon: "flow-arrow",
    summary:
      "Turns a CBO package into an end-to-end business process document with flowcharts, sequence diagrams and step tables.",
    group: "analyze",
    status: "ready",
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO" },
      { label: "Module", kind: "select", options: MODULES.slice(1) },
      { label: "Deliverable", kind: "select", options: ["Markdown", "BPML workbook (xlsx)"] },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese", "German"] },
    ],
  },

  // ---------- build ----------
  {
    slug: "create-program",
    command: "/sc4sap:create-program",
    title: "Create a Program",
    icon: "file-plus",
    summary:
      "Full Phase 0–8 pipeline: Report / CRUD / ALV / Batch, Main+Include structure, OOP or procedural, with a QA pass.",
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
    title: "Create an Object",
    icon: "cube",
    summary:
      "Single-object creation — confirm transport and package, create, activate.",
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
    title: "SAP Doctor",
    icon: "stethoscope",
    summary:
      "Diagnoses plugin health, MCP server connectivity and the SAP connection itself.",
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
