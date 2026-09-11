"use client";

/**
 * Plan item 3-3 — the human in the loop.
 *
 * Two shapes ride the same channel and they are not the same decision:
 *
 *   - `kind: "tool"` is the model asking to *act*. Allow / Deny, with the exact
 *     input on screen, because that is the thing being consented to.
 *   - `kind: "question"` is `AskUserQuestion` — the model asking the user to
 *     *choose*. There is nothing to deny; the answer is the payload, carried
 *     back through `answers` and echoed to the model.
 *
 * It renders into `document.body`. A dialog covers the window, and
 * `position: fixed` only means the window while no ancestor has a transform —
 * and the skill screen raises this from inside a panel that animates on
 * arrival, which turned the overlay into a box sitting in the middle of that
 * panel. The chat screen never showed it because nothing between it and the
 * body is transformed; a portal makes that stop being luck.
 *
 * Note what this dialog cannot do: the L1 blocklist hook runs at PreToolUse,
 * before `canUseTool`, so a forbidden row extraction is denied without ever
 * raising a request here. Allowing something in this dialog can never override
 * the guardrail — it only ever grants what the guardrail already permitted.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PendingApproval, PermissionResponse, Question } from "@/lib/types";

/** Free-text escape hatch, mirroring the "Other" option the CLI offers. */
const OTHER = "__other__";

function questionsOf(request: PendingApproval): Question[] {
  return Array.isArray(request.questions) ? (request.questions as Question[]) : [];
}

/**
 * The SAP MCP prefix, and the read-class test — the browser half of
 * `isSapReadTool` in `src/server/tool-policy.ts`.
 *
 * Duplicated rather than imported for the same reason `types.ts` re-declares
 * the wire types: that module is Node's. The copy decides only whether to
 * *offer* the button; the backend runs its own test before waving anything
 * through, so a copy that drifts shows a useless button rather than granting
 * something it should not.
 */
const SAP_PREFIX = "mcp__plugin_sc4sap_sap__";
const WRITE_CLASS =
  /^(Create|Update|Delete|Patch|Write|Activate|RuntimeRun|RuntimeCreate)|^RunUnitTest$|^ReloadProfile$/;
const ROW_EXTRACTION = new Set(["GetTableContents", "GetSqlQuery"]);
const READ_PREFIXES = ["Get", "Read", "Search", "List", "Describe"];

function isSapReadTool(toolName: string): boolean {
  if (!toolName.startsWith(SAP_PREFIX)) return false;
  const bare = toolName.slice(SAP_PREFIX.length);
  if (WRITE_CLASS.test(bare) || ROW_EXTRACTION.has(bare)) return false;
  return READ_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

type Props = {
  request: PendingApproval;
  busy: boolean;
  /** True once the session is already waving SAP reads through. */
  autoApprove: boolean;
  onSettle: (response: PermissionResponse) => void;
  /** Allow this one and stop asking about SAP reads for the rest of the session. */
  onAllowAll: () => void;
};

export function ApprovalModal({
  request,
  busy,
  autoApprove,
  onSettle,
  onAllowAll,
}: Props) {
  const questions = questionsOf(request);
  const isQuestion = request.kind === "question" && questions.length > 0;

  // Offered only where it would take effect. On a Bash call or a row
  // extraction the switch would not cover the next one either, and a button
  // that reads "allow all" beside a request it does not cover is a promise
  // the backend will refuse to keep.
  const offerAll = !isQuestion && !autoApprove && isSapReadTool(request.toolName);

  // Selected labels per question. Multi-select keeps several; the wire format
  // is one string per question, so they are joined on submit.
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  const toggle = (question: Question, label: string): void => {
    setPicked((current) => {
      const chosen = current[question.question] ?? [];
      if (!question.multiSelect) {
        return { ...current, [question.question]: [label] };
      }
      return {
        ...current,
        [question.question]: chosen.includes(label)
          ? chosen.filter((entry) => entry !== label)
          : [...chosen, label],
      };
    });
  };

  const answerFor = (question: Question): string => {
    const chosen = picked[question.question] ?? [];
    const text = (other[question.question] ?? "").trim();
    const labels = chosen.map((label) =>
      label === OTHER ? text : label,
    );
    return labels.filter(Boolean).join(", ");
  };

  const answerable = questions.every((question) => answerFor(question) !== "");

  const submitAnswers = (): void => {
    onSettle({
      behavior: "allow",
      answers: Object.fromEntries(
        questions.map((question) => [question.question, answerFor(question)]),
      ),
    });
  };

  // Portals need a DOM, and this is rendered on the server first.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-head">
          <span className="modal-kind">
            {isQuestion ? "Question" : "Approval"}
          </span>
          <strong>
            {request.displayName ?? request.title ?? request.toolName}
          </strong>
          {!isQuestion && <code className="modal-tool">{request.toolName}</code>}
        </header>

        {request.description && (
          <p className="modal-description">{request.description}</p>
        )}

        {isQuestion ? (
          <div className="question-list">
            {questions.map((question) => {
              const chosen = picked[question.question] ?? [];
              return (
                <fieldset key={question.question} className="question">
                  <legend>
                    <span className="question-header">{question.header}</span>
                    {question.question}
                  </legend>

                  <div className="options">
                    {question.options.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className={`option${chosen.includes(option.label) ? " picked" : ""}`}
                        onClick={() => toggle(question, option.label)}
                      >
                        <span className="option-label">{option.label}</span>
                        {option.description && (
                          <span className="option-description">
                            {option.description}
                          </span>
                        )}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`option${chosen.includes(OTHER) ? " picked" : ""}`}
                      onClick={() => toggle(question, OTHER)}
                    >
                      <span className="option-label">Other…</span>
                    </button>
                  </div>

                  {chosen.includes(OTHER) && (
                    <input
                      className="option-other"
                      value={other[question.question] ?? ""}
                      placeholder="Your answer"
                      autoFocus
                      onChange={(event) =>
                        setOther((current) => ({
                          ...current,
                          [question.question]: event.target.value,
                        }))
                      }
                    />
                  )}

                  {question.multiSelect && (
                    <p className="question-hint">Pick as many as apply.</p>
                  )}
                </fieldset>
              );
            })}
          </div>
        ) : (
          <>
            <p className="modal-label">Input</p>
            <pre className="modal-input">
              {JSON.stringify(request.input, null, 2)}
            </pre>
          </>
        )}

        <footer className="modal-actions">
          {isQuestion ? (
            <button
              className="primary"
              disabled={busy || !answerable}
              onClick={submitAnswers}
            >
              Answer
            </button>
          ) : (
            <>
              <button
                disabled={busy}
                onClick={() =>
                  onSettle({ behavior: "deny", message: "Denied by the user." })
                }
              >
                Deny
              </button>
              {offerAll && (
                <button disabled={busy} onClick={onAllowAll}>
                  Allow all SAP reads
                </button>
              )}
              <button
                className="primary"
                disabled={busy}
                autoFocus
                onClick={() => onSettle({ behavior: "allow" })}
              >
                Allow
              </button>
            </>
          )}
        </footer>

        <p className="modal-note">
          {offerAll
            ? "“Allow all SAP reads” covers read-only SAP lookups for the rest of this session. Writes stay unreachable, and table and SQL extraction still ask every time."
            : "Unanswered requests are denied after 5 minutes, so a forgotten tab cannot wedge the session."}
        </p>
      </div>
    </div>,
    document.body,
  );
}
