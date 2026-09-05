"use client";

/**
 * First-run connection setup — one question per screen.
 *
 * Four things have to be true before this account can run anything: we know
 * which ABAP stack to talk to, we can log into it, we know what it is, and we
 * have a key to think with. They arrive one card at a time rather than as one
 * long form, because the four are not the same kind of question — a URL, a
 * credential, two facts about the system, and a secret from a different vendor
 * entirely — and a single page mixing them reads as a wall to be got past
 * rather than four answers to be given.
 *
 * The card sits alone on a dimmed ground, so each step reads as a window that
 * has come up in front of the app. It is one element that swaps its contents,
 * not four mounted dialogs: `key={step}` is what re-runs the arrival
 * animation, and `dir` is what decides which side it comes in from, so going
 * back is visibly the reverse of going forward rather than a second forward
 * move.
 *
 * The last Next runs three real checks and then stores the answers — see
 * `connect()`. Nothing is written until all three have passed, so an account
 * that reaches the dashboard has a connection that was reachable at least
 * once.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { WorkingMark } from "@/components/WorkingMark";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Select } from "@/components/Select";
import {
  ABAP_RELEASE_RULE,
  ADT_URL_RULE,
  API_KEY_RULE,
  CLIENT_RULE,
  EMPTY_DRAFT,
  LANGUAGES,
  SAP_VERSIONS,
  isAbapReleaseValid,
  isAdtUrlValid,
  isApiKeyValid,
  isClientValid,
  isStepComplete,
  type SetupDraft,
} from "@/lib/setup";

/**
 * The rail across the foot. `title` is the card's heading as well, so the two
 * cannot drift; `short` is what fits in a four-up rail on a phone.
 */
const STEPS = [
  { short: "System", title: "Where is the system", icon: "link-simple" },
  { short: "Sign-in", title: "How do you log in", icon: "user-circle" },
  { short: "Release", title: "What is the system", icon: "database" },
  { short: "API key", title: "What thinks for it", icon: "key" },
] as const;

/**
 * The lede under each heading, as lines rather than as one string.
 *
 * A list, because where a lede breaks is a decision and not something to leave
 * to the column width: the first step says what is wanted and then what shape
 * it takes, and those are two thoughts that should not run together in the
 * middle of a line. Each entry is rendered as its own block; see
 * `.setup-lede-line`.
 */
const LEDES: readonly (readonly string[])[] = [
  [
    "The ADT endpoint of the ABAP stack this account works against.",
    "Scheme, host and port — the same address an ADT connection in Eclipse points at.",
  ],
  [
    "The logon this session runs as. Everything the agent reads, it reads as this user, so its authorisations are the ceiling on what any skill can reach.",
  ],
  [
    "Which release, and which client. Both decide what is in scope: the release picks the table and TCode catalogue, the client picks the data.",
  ],
  [
    "The key the agent thinks with. It bills to your own Console account, and it is the one credential here that is not SAP's.",
  ],
];

/**
 * The headline, while the checks run.
 *
 * Three of them, cycled, rather than one line held for the whole wait. A
 * message that never changes stops being read within about a second and the
 * screen goes dead under it; three that rotate keep saying "this is still
 * happening" without claiming progress that has not been made — none of them
 * names a step, which is what the line under the spinner is for.
 */
const CONNECTING_LINES = [
  "Connecting to your system",
  "This should take less than a minute",
  "Please wait a moment",
] as const;

/**
 * How long each headline holds before the next one takes over.
 *
 * Long. At two or three seconds the line was changing faster than it could be
 * read, which turns reassurance into fidget — the eye keeps going back to it
 * to see what it missed. Eight seconds is slow enough that a glance away and
 * back lands on the same sentence, and the small line underneath is the one
 * that is meant to be watched.
 */
const LINE_MS = 8000;

/**
 * The checks, in the order they run, and the only place their order is
 * written down.
 *
 * Each `run` is one request to one of the `/api/setup/check/*` endpoints,
 * which do the actual reaching-out — an ABAP stack on a private network is
 * reachable from the Next server and not from the browser, and the Anthropic
 * key must never be somewhere a page's own JavaScript could read it back.
 *
 * The label under the spinner is driven by which of these has resolved, so it
 * advances exactly when its request comes back. That is the whole reason they
 * are three endpoints and not one: a single call doing all three could only
 * say "working" until it was finished.
 *
 * `mock` is the preview path — see the `?preview=connecting` effect below. It
 * runs the same sequence against timers rather than against a system, so the
 * waiting screen can be looked at without four valid answers to hand. The
 * delays are guesses at what the real three cost, not placeholders picked to
 * be quick: a mock that finishes in a second makes a waiting screen impossible
 * to judge, and the headline is on an eight-second cycle.
 */
const CHECKS: readonly {
  label: string;
  run: (draft: SetupDraft) => Promise<void>;
  mock: number;
}[] = [
  {
    label: "Connecting to the SAP system",
    run: (draft) =>
      post("/api/setup/check/sap", {
        adtUrl: draft.adtUrl,
        sapUser: draft.sapUser,
        sapPassword: draft.sapPassword,
        client: draft.client,
      }),
    mock: 4200,
  },
  {
    label: "Checking the MCP connection",
    run: () => post("/api/setup/check/mcp"),
    mock: 3400,
  },
  {
    label: "Verifying your Claude Console details",
    run: (draft) => post("/api/setup/check/claude", { apiKey: draft.apiKey }),
    mock: 2600,
  },
];

/**
 * Which card each check's failure belongs to.
 *
 * The SAP probe sends both the host and the logon, so it can fail for either;
 * it lands on the logon, which is what is wrong the overwhelming majority of
 * the time and is one press from the host. The MCP check is about the server
 * this app talks to and about nothing on any card, so it lands on the last one
 * — where Connect is, and where trying again costs a single press.
 */
const FAILED_STEP = [1, 3, 3] as const;

/**
 * POST to one of our own endpoints, and throw what it said if it refused.
 *
 * The message is the server's, verbatim. Every one of them is written to be
 * read by the person who filled the form in — "The SAP system refused that
 * user and password" names the step to go back to, where a status code does
 * not — so wrapping them in a sentence of our own would only bury them.
 */
async function post(path: string, body?: unknown): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `That step failed (${response.status}).`);
  }
}

/**
 * Development only: the step rail is freely navigable, so a card can be looked
 * at without first satisfying the one before it.
 *
 * The Next button keeps its real gate either way — that is the behaviour being
 * built, and its disabled state is half of what the screen is saying. This
 * only unlocks the rail, and only where `next dev` is serving the page.
 *
 * Remove once the wizard actually saves: at that point reaching a card whose
 * predecessor is empty is a state the endpoint has to have an answer for, and
 * it should not first arrive as a development shortcut.
 */
const FREE_NAV = process.env.NODE_ENV !== "production";

/**
 * Where to go and find the answer, for the steps that have somewhere to send
 * you. `null` where there is nothing useful to say — the control only appears
 * on a card that has one, because a help button that opens a restatement of
 * the lede beside it teaches the reader to stop pressing it.
 */
const HELPS: readonly (string | null)[] = [
  "In SAP GUI, run transaction SICF and use its ADT test function. The SAP URL it opens is the one to paste here.",
  null,
  null,
  null,
];

export function SetupWizard({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SetupDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  /**
   * Which way the next card should come in from — or `initial`, which is not a
   * direction at all.
   *
   * The first card has not been moved to, it is simply what the screen opens
   * on, and sliding it in stacks a 34px horizontal travel on top of the page's
   * own arrival and the two staggered blocks around it. Four transforms
   * resolving at once on a cold load is what the stutter on refresh was. So
   * the opening card only fades, and the slide starts existing at the first
   * Next.
   */
  const [dir, setDir] = useState<"initial" | "forward" | "back">("initial");
  /**
   * Which steps have been left at least once. A rule is not shown against a
   * field still being filled in — the same restraint sign-up shows — but once
   * a step has been passed through, coming back to it should say why it is
   * being refused rather than only greying the button out.
   */
  const [visited, setVisited] = useState<Set<number>>(new Set());
  /** The two secrets typed here, while their reveal toggle is on. */
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Which of the three screens this component is: the questions, the checks
   * running, or the confirmation.
   *
   * A stage rather than a `done` boolean, because the middle one is a screen
   * in its own right and not a busy flag on the last card — it replaces the
   * card, has its own copy, and can end in a failure that neither of the other
   * two can represent.
   */
  const [stage, setStage] = useState<"form" | "connecting" | "done">("form");
  /** How many checks have passed. Also the index of the one now running. */
  const [checked, setChecked] = useState(0);
  /** Which of `CONNECTING_LINES` is showing. */
  const [line, setLine] = useState(0);
  /** "Not now" pressed, and the dialog asking whether that means signing out. */
  const [confirmLeave, setConfirmLeave] = useState(false);

  const set = <K extends keyof SetupDraft>(key: K, value: SetupDraft[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }));

  const complete = isStepComplete(step, draft);
  const last = step === STEPS.length - 1;
  const seen = visited.has(step);

  const secretType = (name: string): "text" | "password" =>
    revealed.has(name) ? "text" : "password";

  const toggleReveal = (name: string): void =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  function go(to: number): void {
    setDir(to > step ? "forward" : "back");
    setVisited((current) => new Set(current).add(step));
    setError(null);
    setStep(to);
  }

  /**
   * The last Next: run the checks in order, save, then confirm.
   *
   * Sequential rather than `Promise.all`, and deliberately so. The three read
   * as a sequence on screen and one failing makes the rest moot — if the
   * system will not accept the logon there is nothing to learn from also
   * asking Anthropic about the key. It also keeps the line under the spinner
   * naming the request actually in flight.
   *
   * The save is last and is not a fourth check. It writes the row that
   * `requireAccount` reads to decide this account is set up, so it must not
   * happen until the three have passed — a stored connection that was never
   * reachable would let every screen behind the wizard through and fail there
   * instead.
   */
  async function connect(mock = false): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    setChecked(0);
    setLine(0);
    setStage("connecting");

    for (const [index, check] of CHECKS.entries()) {
      try {
        if (mock) {
          await new Promise((resolve) => setTimeout(resolve, check.mock));
        } else {
          await check.run(draft);
        }
      } catch (err) {
        // Back to the card, carrying the reason. The alternative — a failure
        // screen of its own — would be a fourth thing to build for a state
        // whose only useful action is "change an answer and try again", and
        // the answers are on the cards.
        //
        // To the card the failure is about, not the one Connect was pressed
        // on: a refused password lands on the password.
        setError((err as Error).message);
        setDir("back");
        setStep(FAILED_STEP[index]);
        setStage("form");
        setBusy(false);
        return;
      }
      setChecked(index + 1);
    }

    if (!mock) {
      try {
        await post("/api/setup", draft);
      } catch (err) {
        setError((err as Error).message);
        setDir("back");
        setStep(STEPS.length - 1);
        setStage("form");
        setBusy(false);
        return;
      }
    }

    setStage("done");
    setBusy(false);
  }

  /**
   * "Not now" — sign out and go back to the sign-in screen.
   *
   * The same shape the account menu's log-out uses, and for the same reasons:
   * `/api/auth/signout` answers 204 whether or not it found a row, so a failed
   * request still navigates rather than stranding someone on a screen they
   * have asked to leave.
   */
  async function leave(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Deliberately swallowed; see above.
    }
    setConfirmLeave(false);
    router.replace("/signin");
    router.refresh();
  }

  /**
   * Development only: `?preview=connecting` opens straight on the checks, and
   * `?preview=done` on the card behind them.
   *
   * Both screens are otherwise four answers away, and the connecting one is
   * the half of this flow that cannot be judged from a screenshot — the mark
   * turns, the headline rotates, and the check line advances. Reload to watch
   * it again; the run is about five seconds.
   *
   * Read from `location` after mount rather than through `useSearchParams`,
   * which would need a Suspense boundary around the whole wizard to prerender
   * — the same trade the sign-in screen makes for its own notices.
   */
  const previewed = useRef(false);
  useEffect(() => {
    if (!FREE_NAV || previewed.current) return;
    previewed.current = true;
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview === "connecting") {
      void connect(true);
    } else if (preview === "done") {
      // Seeded, so the summary is showing a shape rather than four blanks.
      setDraft({
        ...EMPTY_DRAFT,
        adtUrl: "http://tech.sapvista.com:50000",
        sapUser: "SVT_000214",
        abapRelease: "758",
        client: "100",
      });
      setStage("done");
    }
    // Mount only. `connect` is redeclared every render and listing it here
    // would re-run the preview on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only while the checks are running, and cleared when they stop — an
  // interval left running past the screen it belongs to is the classic way a
  // component keeps setting state after it is gone.
  useEffect(() => {
    if (stage !== "connecting") return;
    const timer = setInterval(
      () => setLine((current) => (current + 1) % CONNECTING_LINES.length),
      LINE_MS,
    );
    return () => clearInterval(timer);
  }, [stage]);

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!complete || busy) return;
    if (last) {
      void connect();
      return;
    }
    go(step + 1);
  }

  if (stage === "connecting") {
    return (
      <div className="setup-stage" data-dir="forward">
        {/* `polite`, not `assertive`: the lines below change every couple of
            seconds and interrupting a screen reader three times a wait would
            be worse than saying nothing. `aria-busy` is what actually says
            the screen is working. */}
        {/* Keyed against the done card below, which is also a `<section>` in
            this slot. Without it React reuses the same DOM node and only
            swaps the contents — the card's arrival animation never re-runs,
            and the confirmation appears in one frame with no motion at all. */}
        <section
          className="setup-card setup-connecting"
          key="connecting"
          aria-live="polite"
          aria-busy="true"
        >
          {/* The app's one working mark — see `components/WorkingMark`. */}
          <WorkingMark />

          {/* Keyed, so each line arrives rather than being swapped in place. */}
          <p className="setup-connecting-line" key={CONNECTING_LINES[line]}>
            {CONNECTING_LINES[line]}
          </p>

          <p className="setup-check" key={CHECKS[checked]?.label ?? "last"}>
            {/* The last check has no successor to name, so while it finishes
                the line stays on it rather than blanking. */}
            {(CHECKS[checked] ?? CHECKS[CHECKS.length - 1]).label}
          </p>
        </section>
      </div>
    );
  }

  if (stage === "done") {
    return (
      // `settle` rather than `forward`: this is not the next card in a run,
      // it is the run resolving, and a sideways slide would say otherwise.
      <div className="setup-stage" data-dir="settle">
        <section className="setup-card setup-done" key="done" aria-live="polite">
          <span className="setup-done-mark" aria-hidden="true">
            <Icon name="check-circle" />
          </span>

          <header className="setup-head">
            <h2>All settings have been saved</h2>
            <p className="setup-lede">
              All three checks came back clean and the connection is stored
              against this account. The password and the key are encrypted; the
              rest is what the dashboard shows back.
            </p>
          </header>

          {/* The dashboard's own definition list, unchanged — this panel is
              showing the same kind of thing its SAP system card does, and a
              second style for it would only drift. */}
          <dl className="facts setup-summary">
            <div>
              <dt>ADT endpoint</dt>
              <dd>
                <code>{draft.adtUrl.trim()}</code>
              </dd>
            </div>
            <div>
              <dt>Sign-in</dt>
              <dd>
                {draft.sapUser.trim()} · client {draft.client.trim()} ·{" "}
                {draft.language}
              </dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>
                {SAP_VERSIONS.find((v) => v.value === draft.sapVersion)?.label} ·
                ABAP {draft.abapRelease.trim()}
              </dd>
            </div>
            {/* The key itself is never echoed — not even a tail. A masked
                secret is still a secret leaking its shape, and this panel is
                served to a browser. */}
            <div>
              <dt>Claude API key</dt>
              <dd>Held for this account</dd>
            </div>
          </dl>

          {/* One button, centred. The run is finished and one-way, so there is
              nothing to go back to and nothing to sit opposite — a control
              alone on a row has no reason to be pushed to one end of it.

              No icon either: every other button on this screen carries one
              because it is one of several and the glyph is what tells them
              apart at a glance. This is the only thing left to press. */}
          <div className="setup-actions">
            <button
              className="primary setup-start"
              type="button"
              onClick={() => {
                // The dashboard is `/`, not `/home` — that route does not
                // exist in this app. `replace` so the back button does not
                // land on a wizard that has already been answered.
                router.replace("/");
                router.refresh();
              }}
            >
              Start Now
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="setup-stage" data-dir={dir}>
      {/* Keyed by step, so each answer arrives as its own window rather than
          as the previous one's text being replaced in place. */}
      <form className="setup-card" key={step} onSubmit={submit}>
        <div className="setup-kind">
          <Icon name={STEPS[step].icon} />
          Step {step + 1} of {STEPS.length}
          {HELPS[step] ? <StepHelp step={step} text={HELPS[step]} /> : null}
        </div>

        <header className="setup-head">
          <h2>{STEPS[step].title}</h2>
          <p className="setup-lede">
            {LEDES[step].map((line) => (
              <span className="setup-lede-line" key={line}>
                {line}
              </span>
            ))}
          </p>
        </header>

        <div className="setup-fields">
          {step === 0 ? (
            <label className="field">
              <span className="field-label">SAP ADT URL</span>
              <input
                className={
                  seen && !isAdtUrlValid(draft.adtUrl) ? "is-invalid" : undefined
                }
                type="text"
                name="adtUrl"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://sap-dev.example.com:44300"
                value={draft.adtUrl}
                onChange={(event) => set("adtUrl", event.target.value)}
                aria-invalid={(seen && !isAdtUrlValid(draft.adtUrl)) || undefined}
                autoFocus
              />
              <span
                className={
                  seen && !isAdtUrlValid(draft.adtUrl)
                    ? "field-error"
                    : "field-hint"
                }
              >
                {ADT_URL_RULE}
              </span>
            </label>
          ) : null}

          {step === 1 ? (
            <>
              <label className="field">
                <span className="field-label">SAP GUI user</span>
                <input
                  type="text"
                  name="sapUser"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="SVT_000214"
                  value={draft.sapUser}
                  onChange={(event) =>
                    // Logon users are upper case on every stack this runs
                    // against. A lower-case one otherwise fails at the ADT
                    // handshake instead of here, where the message can at
                    // least say which of the two fields was wrong.
                    set("sapUser", event.target.value.toUpperCase())
                  }
                  autoFocus
                />
              </label>

              <label className="field">
                <span className="field-label">Password</span>
                <span className="field-secret">
                  <input
                    type={secretType("sapPassword")}
                    name="sapPassword"
                    autoComplete="off"
                    placeholder="••••••••"
                    value={draft.sapPassword}
                    onChange={(event) => set("sapPassword", event.target.value)}
                  />
                  <button
                    className="field-reveal"
                    type="button"
                    onClick={() => toggleReveal("sapPassword")}
                    aria-label={
                      revealed.has("sapPassword")
                        ? "Hide the password"
                        : "Show the password"
                    }
                  >
                    <Icon
                      name={revealed.has("sapPassword") ? "eye-slash" : "eye"}
                    />
                  </button>
                </span>
                <span className="field-hint">
                  The same two you would type at the SAP GUI logon screen.
                </span>
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="field-pair">
                {/* A `div`, not a `label`: the control is a button, and a
                    label wrapping a button is announced as a label for
                    nothing. `aria-labelledby` does the association instead. */}
                <div className="field">
                  <span className="field-label" id="setup-release-label">
                    Release
                  </span>
                  <Select
                    name="sapVersion"
                    labelledBy="setup-release-label"
                    value={draft.sapVersion}
                    options={SAP_VERSIONS.map((version) => ({
                      value: version.value,
                      label: version.label,
                    }))}
                    onChange={(next) =>
                      set("sapVersion", next as SetupDraft["sapVersion"])
                    }
                    autoFocus
                  />
                </div>

                <label className="field">
                  <span className="field-label">ABAP release</span>
                  <input
                    className={
                      seen && !isAbapReleaseValid(draft.abapRelease)
                        ? "is-invalid"
                        : undefined
                    }
                    type="text"
                    name="abapRelease"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="758"
                    value={draft.abapRelease}
                    onChange={(event) =>
                      set("abapRelease", event.target.value.replace(/\D/g, ""))
                    }
                  />
                  <span
                    className={
                      seen && !isAbapReleaseValid(draft.abapRelease)
                        ? "field-error"
                        : "field-hint"
                    }
                  >
                    {ABAP_RELEASE_RULE}
                  </span>
                </label>
              </div>

              <div className="field-pair">
                <label className="field">
                  <span className="field-label">Client</span>
                  <input
                    className={
                      seen && !isClientValid(draft.client)
                        ? "is-invalid"
                        : undefined
                    }
                    type="text"
                    name="client"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="100"
                    value={draft.client}
                    onChange={(event) =>
                      set("client", event.target.value.replace(/\D/g, ""))
                    }
                  />
                  <span
                    className={
                      seen && !isClientValid(draft.client)
                        ? "field-error"
                        : "field-hint"
                    }
                  >
                    {CLIENT_RULE}
                  </span>
                </label>

                <div className="field">
                  <span className="field-label" id="setup-language-label">
                    Logon language
                  </span>
                  <Select
                    name="language"
                    labelledBy="setup-language-label"
                    value={draft.language}
                    options={LANGUAGES.map((language) => ({
                      value: language.code,
                      label: language.label,
                    }))}
                    onChange={(next) => set("language", next)}
                  />
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <label className="field">
              <span className="field-label">Claude Console API key</span>
              <span className="field-secret">
                <input
                  className={
                    seen && !isApiKeyValid(draft.apiKey) ? "is-invalid" : undefined
                  }
                  type={secretType("apiKey")}
                  name="apiKey"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-ant-…"
                  value={draft.apiKey}
                  onChange={(event) => set("apiKey", event.target.value)}
                  autoFocus
                />
                <button
                  className="field-reveal"
                  type="button"
                  onClick={() => toggleReveal("apiKey")}
                  aria-label={
                    revealed.has("apiKey") ? "Hide the key" : "Show the key"
                  }
                >
                  <Icon name={revealed.has("apiKey") ? "eye-slash" : "eye"} />
                </button>
              </span>
              <span
                className={
                  seen && !isApiKeyValid(draft.apiKey)
                    ? "field-error"
                    : "field-hint"
                }
              >
                {API_KEY_RULE}
              </span>
              <p className="setup-aside">
                Issued from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  console.anthropic.com
                </a>
                . A Claude Code or claude.ai login cannot be used here —
                Anthropic does not permit one for third-party SDK apps. Set a
                spend cap on the key while you are there.
              </p>
            </label>
          ) : null}
        </div>

        {error ? (
          <p className="auth-status is-error" role="alert">
            <Icon name="warning-circle" /> {error}
          </p>
        ) : null}

        <div className="setup-actions">
          {/* No Back. The four steps are a one-way run: each card is a
              different question rather than a stage of one, and a control that
              walks backwards through them turns four short answers into a form
              to be paged around.

              So the only thing on the left is the way out — and it has to be
              reachable, because an account that cannot supply a key yet is
              otherwise stuck on a screen it can neither complete nor leave. A
              plain link to `/signin` would not do it: the middleware bounces a
              signed-in reader straight back here, and once the dashboard
              redirects an unconfigured account to `/setup`, so will `/`.

              Which is why it asks first. "Not now" reads as "remind me later"
              and actually ends the session; the dialog is what closes that
              gap, and it is the same one the account menu's log-out raises
              rather than a second dialog saying the same thing. */}
          <button
            className="link-button setup-escape"
            type="button"
            onClick={() => setConfirmLeave(true)}
            disabled={busy}
          >
            Not now
          </button>

          <span className="setup-spacer" />

          <button className="primary" type="submit" disabled={!complete || busy}>
            <Icon
              name={
                busy ? "circle-notch" : last ? "plugs-connected" : "arrow-right"
              }
            />
            {busy ? "Connecting…" : last ? "Connect" : "Next"}
          </button>
        </div>
      </form>

      <SetupRail step={step} onJump={go} firstName={firstName} />

      {confirmLeave && (
        <ConfirmModal
          kind="Leave setup"
          heading="Leave setup and sign out?"
          description="There is nothing to run until this is finished, so leaving it ends the session. Nothing typed here is kept — the four answers are asked again next time you sign in."
          confirmLabel="Sign out"
          confirmIcon="sign-out"
          cancelLabel="Keep going"
          onConfirm={() => void leave()}
          onCancel={() => setConfirmLeave(false)}
          busy={busy}
        />
      )}
    </div>
  );
}


/**
 * The `?` in the card's top right, and what it says.
 *
 * Hover and focus both open it, and it is a `<button>` rather than a `<span>`
 * with a `title` for two reasons: the native tooltip cannot be reached from a
 * keyboard at all, and it waits about a second before appearing, which is long
 * enough that a reader who is stuck has usually stopped hovering. Nothing
 * happens on click — there is no panel behind it — so it carries no handler,
 * only the label screen readers announce.
 *
 * Shown by CSS, not by state: a bubble that exists in the markup and is
 * revealed by `:hover`/`:focus-within` cannot get stuck open, and costs no
 * render. `aria-describedby` is what ties the two together, so the text is
 * announced as the button's description rather than read as a stray paragraph
 * in the middle of the form.
 */
function StepHelp({ step, text }: { step: number; text: string }) {
  const id = `setup-help-${step}`;
  return (
    <span className="setup-help">
      <button
        className="setup-help-button"
        type="button"
        aria-label="Where to find this"
        aria-describedby={id}
      >
        <Icon name="question" />
      </button>
      <span className="setup-help-bubble" id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

/**
 * The step rail, under the card rather than over it.
 *
 * Below, because it is a map and not a control: what matters on this screen is
 * the one question in front of you, and a progress bar above the heading takes
 * the first read.
 *
 * An indicator, not a control. The run is one-way — there is no Back on the
 * card either — so pressing a step you have already answered would be the Back
 * button under a different name, and the screen would be saying two things at
 * once. Every dot is inert outside development; see `FREE_NAV`.
 *
 * Which is also why nothing here reacts to a hover. A control that lights up
 * under the pointer is promising a click, and this one has none to give: the
 * only thing the ink means is how far along the run you are.
 */
function SetupRail({
  step,
  onJump,
  firstName,
}: {
  step: number;
  onJump: (to: number) => void;
  firstName: string;
}) {
  return (
    <div className="setup-rail">
      <ol className="setup-dots">
        {STEPS.map((entry, index) => {
          // Everything up to and including the current step is filled, so the
          // row reads as a bar that has got this far — not as one lit dot
          // travelling along a dim track. `done` and `current` are painted the
          // same; what separates them is the mark inside, a tick for a step
          // behind you and its number for the one you are on.
          const state =
            index === step ? "current" : index < step ? "done" : "upcoming";
          return (
            <li key={entry.short} className={`setup-dot is-${state}`}>
              <button
                type="button"
                onClick={() => onJump(index)}
                disabled={!FREE_NAV || index === step}
                aria-current={index === step ? "step" : undefined}
              >
                <span className="setup-dot-mark" aria-hidden="true">
                  {index < step ? <Icon name="check" /> : index + 1}
                </span>
                <span className="setup-dot-label">{entry.short}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="setup-rail-note">
        {firstName}, this is asked once. Everything after it is the app.
      </p>
    </div>
  );
}
