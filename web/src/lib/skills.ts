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

export type SkillGroupId = "analyze" | "document" | "build" | "system";

export type SkillFieldKind = "text" | "textarea" | "select" | "toggle";

export type SkillField = {
  label: string;
  kind: SkillFieldKind;
  placeholder?: string;
  options?: string[];
  hint?: string;
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
};

export type SkillGroup = {
  id: SkillGroupId;
  label: string;
  /** Rendered under the group heading in the expanded rail. */
  hint: string;
};

export const SKILL_GROUPS: SkillGroup[] = [
  { id: "analyze", label: "Analyze", hint: "Read the system, answer questions" },
  { id: "document", label: "Document", hint: "Turn source into deliverables" },
  { id: "build", label: "Build", hint: "Create and transport objects" },
  { id: "system", label: "System", hint: "Connection, profile, diagnostics" },
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
      { label: "Object name", kind: "text", placeholder: "ZMM_PO_REPORT" },
      { label: "Review focus", kind: "select", options: ["All", "Clean ABAP", "Performance", "Security", "SAP standard compliance"] },
      { label: "Render a written briefing", kind: "toggle", hint: "Adds a sap-writer pass on top of the raw findings." },
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
    fields: [
      { label: "Symptom type", kind: "select", options: ["Short dump", "Error message", "Wrong result", "Performance", "Transport failure"] },
      { label: "Dump ID / message / transport", kind: "text", placeholder: "CX_SY_OPEN_SQL_DB, or SAPKB75… " },
      { label: "Where it happened", kind: "text", placeholder: "TCode, program or job name" },
      { label: "What you observed", kind: "textarea", placeholder: "When it started, who hit it, what changed recently." },
    ],
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
    group: "document",
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
    group: "document",
    status: "ready",
    fields: [
      { label: "Package", kind: "text", placeholder: "ZMM_CBO" },
      { label: "Module", kind: "select", options: MODULES.slice(1) },
      { label: "Deliverable", kind: "select", options: ["Markdown", "BPML workbook (xlsx)"] },
      { label: "Language", kind: "select", options: ["Korean", "English", "Japanese", "German"] },
    ],
  },
  {
    slug: "deep-interview",
    command: "/sc4sap:deep-interview",
    title: "Deep Interview",
    icon: "question",
    summary:
      "A Socratic interview that crystallizes a vague requirement into a spec before any code is generated.",
    group: "document",
    status: "ready",
    fields: [
      { label: "Topic", kind: "textarea", placeholder: "The requirement as you have it today — rough is fine, that is the point." },
      { label: "Depth", kind: "select", options: ["Quick pass", "Standard", "Exhaustive"] },
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
  {
    slug: "release",
    command: "/sc4sap:release",
    title: "Release a Transport",
    icon: "truck",
    summary: "CTS workflow — list, validate, release, confirm the import.",
    group: "build",
    status: "blocked",
    blockedReason:
      "Transport release mutates the landscape. Opening it needs the approval policy from the Post-PoC backlog.",
    fields: [
      { label: "Transport", kind: "select", options: ["Pick from the open request list"] },
      { label: "Validate before releasing", kind: "toggle", hint: "Syntax check plus an inactive-object sweep." },
    ],
  },
  {
    slug: "team",
    command: "/sc4sap:team",
    title: "Agent Team",
    icon: "users-three",
    summary:
      "N coordinated SAP agents working one shared task list.",
    group: "build",
    status: "blocked",
    blockedReason:
      "Built on Claude Code native teams, which the Agent SDK does not expose. Substituting SDK subagents is a Post-PoC item.",
    fields: [
      { label: "Task list", kind: "textarea", placeholder: "One task per line." },
      { label: "Agents", kind: "select", options: ["2", "3", "4", "5"] },
    ],
  },

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
  {
    slug: "sap-option",
    command: "/sc4sap:sap-option",
    title: "SAP Options",
    icon: "sliders",
    summary:
      "The connection snapshot and the editable values behind it — credentials, blocklist profile, HUD limits.",
    group: "system",
    status: "blocked",
    blockedReason:
      "Edits `.sc4sap/sap.env` on the backend host, which is shared by every session until Phase 5 lands per-session workspaces.",
    fields: [
      { label: "Profile alias", kind: "text", placeholder: "KR-DEV" },
      { label: "Blocklist profile", kind: "select", options: ["Strict", "Standard", "Relaxed"] },
    ],
  },
  {
    slug: "setup",
    command: "/sc4sap:setup",
    title: "Connection Setup",
    icon: "plugs-connected",
    summary:
      "Registers a SAP connection profile, installs the MCP server and the two PreToolUse guards.",
    group: "system",
    status: "blocked",
    blockedReason:
      "Writes a profile under the backend host's home directory. Per-user credential intake is Phase 5-2.",
    fields: [
      { label: "Profile alias", kind: "text", placeholder: "KR-DEV" },
      { label: "Application server host", kind: "text", placeholder: "sap-dev.example.com" },
      { label: "Client", kind: "text", placeholder: "100" },
      { label: "User", kind: "text" },
      { label: "Password", kind: "text", hint: "Stored server-side today. See Phase 5-6 before this ships." },
    ],
  },
  {
    slug: "mcp-setup",
    command: "/sc4sap:mcp-setup",
    title: "MCP Setup Guide",
    icon: "terminal-window",
    summary:
      "How to install and configure the abap-mcp-adt-powerup server for ADT connectivity.",
    group: "system",
    status: "blocked",
    blockedReason:
      "A local install guide. Under the web PoC the MCP server is already running on the backend, so there is nothing to configure from here.",
    fields: [],
  },
];

export const SKILLS_BY_GROUP: { group: SkillGroup; skills: Skill[] }[] =
  SKILL_GROUPS.map((group) => ({
    group,
    skills: SKILLS.filter((skill) => skill.group === group.id),
  }));

export function findSkill(slug: string): Skill | undefined {
  return SKILLS.find((skill) => skill.slug === slug);
}
