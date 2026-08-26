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
 * So it asks the backend directly rather than only re-rendering the page. The
 * response is the thing reported, which means the dialog says what this press
 * found rather than what the last render happened to be holding, and a request
 * that fails outright has somewhere to be reported instead of vanishing.
 * `router.refresh()` then redraws the panel from the same check.
 *
 * `?fresh=1` matters here. The backend caches the key check for half a minute
 * so that ordinary renders do not each cost a round trip to Anthropic; someone
 * pressing a button labelled Reconnect is owed a real check, and without the
 * bypass this returned a cached answer instantly — no delay, no change, no
 * sign it had run.
 *
 * What it still is not is a reconnection. Two of the three rows have a real
 * source behind them — the backend health call, and the key check the backend
 * performs against `GET /v1/models`; the SAP row does not, so there is no SAP
 * connection here to re-establish. See `lib/account.ts`, and the README's
 * "Not yet done" for what Phase 5-2/5-3 has to land first.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { NoticeModal } from "@/components/NoticeModal";

/** What the press found. Every press produces exactly one of these. */
type Outcome =
  /** Healthy, and it already was. Nothing happened, which is the news. */
  | { kind: "connected" }
  /** Healthy, and it was not before this press. Something did happen. */
  | { kind: "reconnected" }
  /**
   * The check ran and something answered badly. `remedy` is set when this
   * button is not the thing that can fix it — see `check`.
   */
  | { kind: "problems"; detail: string; remedy: string | null }
  /** The check could not be run at all. */
  | { kind: "unreachable"; detail: string };

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
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const check = async (): Promise<void> => {
    if (checking) return;
    setChecking(true);
    try {
      const health = await api.health(true);

      // Only rows with a source of their own can fail here. The SAP row is
      // drawn from this same call rather than measured, so it has nothing to
      // contribute — when it does, this is where it joins.
      const problems: string[] = [];
      let remedy: string | null = null;

      if (health.claudeApi.state === "down") {
        problems.push(`the Claude API key was refused — ${health.claudeApi.detail}`);
        // Pressing this again will keep returning the same answer, however
        // many times it is pressed, and a dialog that reports a failure while
        // implying the button might fix it is worse than no dialog. The key
        // is read from the backend's own environment at startup and there is
        // nowhere in this app to replace it, so the way out is named here
        // rather than left to be guessed at.
        remedy =
          "This button cannot replace it: the key is read from the backend's .env when the server starts, and there is no screen in this app that sets one yet. A valid key has to be put there and `npm run server` restarted.";
      } else if (health.claudeApi.state === "unknown") {
        // Not a refusal — the question went unanswered, and asking again is a
        // reasonable thing to do about that.
        problems.push(
          `the Claude API key could not be checked — ${health.claudeApi.detail}`,
        );
      }

      if (problems.length > 0) {
        setOutcome({ kind: "problems", detail: problems.join(", and "), remedy });
      } else {
        setOutcome({ kind: wasConnected ? "connected" : "reconnected" });
      }
    } catch (error) {
      // The proxy answers a dead backend with a 502 carrying its own sentence,
      // so this is usually that sentence rather than a bare status.
      setOutcome({ kind: "unreachable", detail: (error as Error).message });
    } finally {
      setChecking(false);
      // The panel is server-rendered, so it redraws from a new render rather
      // than from the response above. Same check either way: the fetch has
      // just refilled the backend's cache, which this read hits.
      router.refresh();
    }
  };

  const dialog = outcome ? describe(outcome) : null;

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
        {checking ? "Checking…" : online ? "Reconnect" : "Connect to server"}
      </button>

      {dialog ? (
        <NoticeModal
          kind="Connection"
          icon={dialog.icon}
          heading={dialog.heading}
          description={dialog.description}
          onDismiss={() => setOutcome(null)}
        />
      ) : null}
    </>
  );
}

/** The dialog for one outcome. A switch, so a new outcome fails to compile. */
function describe(outcome: Outcome): {
  icon: string;
  heading: string;
  description: string;
} {
  switch (outcome.kind) {
    case "connected":
      return {
        icon: "check-circle",
        heading: "Everything is connected",
        description:
          "Re-checked just now: the agent backend is answering and its Claude API key was accepted. Nothing needed reconnecting. Run diagnostics if you want the detail behind that.",
      };
    case "reconnected":
      return {
        icon: "check-circle",
        heading: "Reconnected",
        description:
          "Something was failing a moment ago and is answering again: the agent backend responded and its Claude API key was accepted. The connection panel behind this has caught up.",
      };
    case "problems":
      return {
        icon: "warning-circle",
        heading: "Still not connected",
        // The row already carries this, but the row does not change when the
        // answer does not — so the press says it too, and says it as the
        // result of the press rather than as a standing fact.
        description: `Re-checked just now, and ${outcome.detail}. ${
          outcome.remedy ??
          "The connection panel has the same answer against the row it belongs to."
        }`,
      };
    case "unreachable":
      return {
        icon: "warning-circle",
        heading: "The check could not be run",
        description: `Nothing answered, so nothing about the connection can be reported either way: ${outcome.detail}`,
      };
  }
}
