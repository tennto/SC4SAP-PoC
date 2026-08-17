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
 * Note what this dialog cannot do: the L1 blocklist hook runs at PreToolUse,
 * before `canUseTool`, so a forbidden row extraction is denied without ever
 * raising a request here. Allowing something in this dialog can never override
 * the guardrail — it only ever grants what the guardrail already permitted.
 */
import { useState } from "react";
import type { PendingApproval, PermissionResponse, Question } from "@/lib/types";

/** Free-text escape hatch, mirroring the "Other" option the CLI offers. */
const OTHER = "__other__";

function questionsOf(request: PendingApproval): Question[] {
  return Array.isArray(request.questions) ? (request.questions as Question[]) : [];
}

type Props = {
  request: PendingApproval;
  busy: boolean;
  onSettle: (response: PermissionResponse) => void;
};

export function ApprovalModal({ request, busy, onSettle }: Props) {
  const questions = questionsOf(request);
  const isQuestion = request.kind === "question" && questions.length > 0;

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

  return (
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
          Unanswered requests are denied after 5 minutes, so a forgotten tab
          cannot wedge the session.
        </p>
      </div>
    </div>
  );
}
