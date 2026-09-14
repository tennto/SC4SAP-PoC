"use client";

/**
 * The connection panel's primary action.
 *
 * A client island in an otherwise server-rendered dashboard, because the two
 * things it does — running a check on demand and reporting what it found —
 * both need the browser. The button itself lives here rather than on the page
 * so that the page has no reason to be a client component.
 *
 * **Every press ends in an answer.** The first version only spoke up when
 * everything was already green, on the reasoning that any other outcome would
 * show itself as a change in the panel. That was wrong twice over: the panel
 * only changes when the *state* changes, so pressing this while something was
 * down did nothing visible at all — and that is precisely the moment feedback
 * is wanted. A control that answers sometimes is worse than one that never
 * does, because the silence has to be interpreted.
 *
 * So it asks directly rather than only re-rendering the page. Two questions,
 * in parallel, because they have nothing to do with each other:
 *
 * - The backend's `/health`, with `?fresh=1`. The backend caches its key check
 *   for half a minute so that ordinary renders do not each cost a round trip
 *   to Anthropic; someone pressing a button labelled Reconnect is owed a real
 *   check, and without the bypass this returned a cached answer instantly —
 *   no delay, no change, no sign it had run.
 * - This account's stored SAP connection, through `/api/account/connection/
 *   check`. That runs on the Next server, which is the only place the sealed
 *   password can be opened, and it writes what it finds to the row — so the
 *   SAP row of the panel, which is server-rendered, redraws from the same
 *   answer this press got.
 *
 * `router.refresh()` then redraws the panel from both.
 *
 * **Every failure names a way onward.** A dialog that reports "the SAP system
 * refused that user and password" and offers only OK has told the reader what
 * is wrong and left them to work out where to go about it. The SAP Doctor
 * skill is that place — it walks the plugin, the MCP server and the SAP
 * connection layer by layer and says what to fix — so a failed press offers
 * it as the primary button, and hands over what this press found so the run
 * can start from the finding rather than from nothing. See `SkillForm`'s
 * `autorun`.
 *
 * What it still is not is a reconnection. Nothing here re-establishes
 * anything; it measures, and says what it measured.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { NoticeModal } from "@/components/NoticeModal";
import { useLocale } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

type Strings = Messages["reconnect"];

/** What the press found. Every press produces exactly one of these. */
type Outcome =
  /** Healthy, and it already was. Nothing happened, which is the news. */
  | { kind: "connected" }
  /** Healthy, and it was not before this press. Something did happen. */
  | { kind: "reconnected" }
  /**
   * The check ran and something answered badly. `remedy` is set when neither
   * this button nor the doctor is the thing that can fix it — see `check`.
   */
  | { kind: "problems"; detail: string; remedy: string | null }
  /** The check could not be run at all. */
  | { kind: "unreachable"; detail: string };

/**
 * Ask the Next server to probe the stored SAP connection.
 *
 * Not on `api`, which is the door to the backend: this is a route of the web
 * app's own, and the one place in the app that can reach the sealed password.
 */
async function checkSap(
  t: Strings,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const response = await fetch("/api/account/connection/check", {
    method: "POST",
  });
  const body = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
  };
  if (response.ok) return { ok: true };
  return {
    ok: false,
    detail: body.error ?? t.checkAnswered(response.status),
  };
}

export function ReconnectButton({
  online,
  wasConnected,
}: {
  /** The backend is answering. Decides which of the two buttons this is. */
  online: boolean;
  /**
   * Whether the panel the reader is looking at was healthy before the press.
   *
   * From the last server render, which is exactly what is on their screen —
   * so comparing it against what the press finds is what separates "still
   * fine" from "it came back", and those two deserve different sentences.
   */
  wasConnected: boolean;
}) {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.reconnect;
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const check = async (): Promise<void> => {
    if (checking) return;
    setChecking(true);
    try {
      // `allSettled`, not `all`: a backend that is down must not stop the SAP
      // probe from reporting, and the other way round. Each row gets its own
      // sentence either way.
      const [healthResult, sapResult] = await Promise.allSettled([
        api.health(true),
        checkSap(t),
      ]);

      const problems: string[] = [];
      let remedy: string | null = null;

      if (healthResult.status === "rejected") {
        // The proxy answers a dead backend with a 502 carrying its own
        // sentence, so this is usually that sentence rather than a bare
        // status. Nothing else can be reported about the backend's rows when
        // the backend is not there to ask.
        problems.push(
          t.backendDidNotAnswer((healthResult.reason as Error).message),
        );
        // The doctor runs on that backend, so offering it here would offer
        // a run with nowhere to run. Starting the server is the only step.
        remedy = t.backendRemedy;
      } else {
        const health = healthResult.value;
        if (health.claudeApi.state === "down") {
          problems.push(t.keyRefused(health.claudeApi.detail));
          // Pressing this again will keep returning the same answer, however
          // many times it is pressed, and neither this button nor the doctor
          // can change a key the backend reads from its own environment at
          // startup. The way out is named here rather than left to be
          // guessed at.
          remedy = t.keyRemedy;
        } else if (health.claudeApi.state === "unknown") {
          // Not a refusal — the question went unanswered, and asking again is
          // a reasonable thing to do about that.
          problems.push(t.keyUnchecked(health.claudeApi.detail));
        }
      }

      if (sapResult.status === "rejected") {
        problems.push(t.sapUnchecked((sapResult.reason as Error).message));
      } else if (!sapResult.value.ok) {
        problems.push(t.sapRefused(sapResult.value.detail));
      }

      if (problems.length === 0) {
        setOutcome({ kind: wasConnected ? "connected" : "reconnected" });
      } else if (healthResult.status === "rejected" && sapResult.status === "rejected") {
        setOutcome({ kind: "unreachable", detail: problems.join(t.joiner) });
      } else {
        setOutcome({ kind: "problems", detail: problems.join(t.joiner), remedy });
      }
    } finally {
      setChecking(false);
      // The panel is server-rendered, so it redraws from a new render rather
      // than from the responses above. Same checks either way: the health
      // fetch has just refilled the backend's cache, and the SAP probe has
      // just written its answer to the row.
      router.refresh();
    }
  };

  /**
   * Hand the finding to the doctor and go.
   *
   * The detail rides in the URL rather than in storage because it belongs to
   * this navigation and nothing else: a reload of the doctor page should not
   * re-run against a failure from an hour ago, and `SkillForm` strips the
   * query once it has read it for exactly that reason.
   */
  const diagnose = (detail: string): void => {
    const query = new URLSearchParams({
      autorun: "1",
      // The detail is a sentence with its own full stop; do not add a second.
      context: `The web dashboard's connection check has just failed: ${detail.replace(/\.$/, "")}. Start the diagnosis from that finding.`,
    });
    router.push(`/skills/sap-doctor?${query.toString()}`);
  };

  const dialog = outcome ? describe(outcome, t) : null;

  return (
    <>
      <button
        className={online ? "ghost" : "primary"}
        onClick={() => void check()}
        disabled={checking}
      >
        <Icon
          name={
            checking
              ? "circle-notch"
              : online
                ? "arrows-clockwise"
                : "plugs-connected"
          }
        />
        {checking ? t.checking : online ? t.reconnect : t.connect}
      </button>

      {dialog && outcome ? (
        <NoticeModal
          kind={t.kind}
          icon={dialog.icon}
          heading={dialog.heading}
          description={dialog.description}
          dismissLabel={t.ok}
          onDismiss={() => setOutcome(null)}
          action={
            dialog.diagnose
              ? {
                  label: t.runDoctor,
                  icon: "stethoscope",
                  onClick: () => diagnose(dialog.diagnose as string),
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}

/**
 * The dialog for one outcome. A switch, so a new outcome fails to compile.
 *
 * `diagnose` is the finding to hand the doctor, and is set only on outcomes
 * the doctor can do something about. A refused API key is not one: the doctor
 * would walk every layer and arrive at the same sentence the dialog already
 * holds.
 */
function describe(
  outcome: Outcome,
  t: Strings,
): {
  icon: string;
  heading: string;
  description: string;
  diagnose: string | null;
} {
  switch (outcome.kind) {
    case "connected":
      return {
        icon: "check-circle",
        heading: t.connectedHeading,
        description: t.connectedBody,
        diagnose: null,
      };
    case "reconnected":
      return {
        icon: "check-circle",
        heading: t.reconnectedHeading,
        description: t.reconnectedBody,
        diagnose: null,
      };
    case "problems":
      return {
        icon: "warning-circle",
        heading: t.problemsHeading,
        // The row already carries this, but the row does not change when the
        // answer does not — so the press says it too, and says it as the
        // result of the press rather than as a standing fact.
        description: t.problemsBody(
          outcome.detail,
          outcome.remedy ?? t.doctorRemedy,
        ),
        diagnose: outcome.remedy ? null : outcome.detail,
      };
    case "unreachable":
      return {
        icon: "warning-circle",
        heading: t.unreachableHeading,
        description: t.unreachableBody(outcome.detail),
        // The doctor runs on the backend. With the backend not answering
        // there is nowhere for it to run.
        diagnose: null,
      };
  }
}
