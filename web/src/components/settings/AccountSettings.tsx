"use client";

/**
 * Who this account is, and the two things about it that can be changed.
 *
 * An identity card first, then rows. The card is the answer to the question
 * most visits to this screen are actually asking — which account am I in — and
 * it is a card rather than a first row because a name and an address are read
 * as a person, not as two settings.
 *
 * Nothing below it is a live input. These are read far more often than they
 * are changed, and a form of open fields answers "what is my name" while
 * asking "is this a value, or a value I am in the middle of changing". The
 * pencil is what says the row can move.
 *
 * Email is shown and has no pencil. It is the unique key every session, reset
 * and Google link hangs off, so changing it is a flow of its own — verify the
 * new address before it becomes the one that can receive a reset — rather than
 * a field on a form. What it carries instead is the mark of whoever vouches
 * for it: Google’s, or ours.
 *
 * The password row has no pencil on an account that has no password. That is
 * every Google account, which is the case worth naming — there is nothing to
 * change, and a control that opened a dialog to say so would be a control that
 * does nothing. Written as "has a password" rather than "is not Google"
 * because an account can be both, and that one keeps its pencil.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleMark } from "@/components/GoogleMark";
import { Icon } from "@/components/Icon";
import { Sc4Mark } from "@/components/Sc4Mark";
import { EditButton, EditModal, SettingRow } from "@/components/settings/EditModal";
import { isPasswordValid, PASSWORD_MISMATCH, PASSWORD_RULE } from "@/lib/password";

/** What an `/api/account/*` route answers with when it refuses. */
type Refusal = { error?: string; field?: string };

async function send(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
): Promise<Refusal | null> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  // A refusal that is not JSON is still a refusal; the status is what is
  // certain, so it carries the message when the body cannot.
  return (
    ((await response.json().catch(() => null)) as Refusal | null) ?? {
      error: `The server answered ${response.status}.`,
    }
  );
}

export function AccountSettings({
  lastName: storedLast,
  firstName: storedFirst,
  email,
  memberSince,
  hasPassword,
  isGoogle,
}: {
  lastName: string;
  firstName: string;
  email: string;
  memberSince: string;
  hasPassword: boolean;
  /** The row has been linked to a Google account. */
  isGoogle: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<"name" | "password" | null>(null);
  // Held here rather than in the row, so the confirmation survives the dialog
  // that produced it closing.
  const [done, setDone] = useState<"name" | "password" | null>(null);

  const name = `${storedLast} ${storedFirst}`.trim();

  return (
    <section className="panel">
      <div className="identity">
        {/* Round, like the one in the account menu, and for the same reason:
            this slot stands for a person rather than a control. */}
        <span className="identity-avatar" aria-hidden="true">
          <Icon name="user" />
        </span>
        <div className="identity-main">
          <p className="identity-name">{name || "Unnamed account"}</p>
          <p className="identity-email">{email}</p>
        </div>
      </div>

      <div className="setting-rows">
        <SettingRow
          label="Name"
          value={name || "Not set"}
          hint={
            done === "name" ? "Saved." : `Member since ${memberSince}.`
          }
          action={
            <EditButton label="Edit name" onClick={() => setEditing("name")} />
          }
        />

        <SettingRow
          label="Password"
          // Never the length of the real one: a mask that matched it would be
          // telling anyone reading over a shoulder how long it is.
          value={hasPassword ? "••••••••••" : "Not set"}
          hint={
            done === "password"
              ? "Changed. Other sessions signed out."
              : hasPassword
                ? "Changing it signs every other session out."
                : "This account signs in through Google and has no password."
          }
          action={
            hasPassword ? (
              <EditButton
                label="Change password"
                onClick={() => setEditing("password")}
              />
            ) : undefined
          }
        />

        <SettingRow
          label="Email"
          value={email}
          hint="The address you sign in with. Changing it is not a settings change — the new one has to be verified first."
          // Whose account this is, in the one slot the row has for it. Centred
          // against the value rather than the label, which is where the pencil
          // on the rows above sits.
          action={
            <span className="setting-mark" aria-hidden="true">
              {isGoogle ? <GoogleMark /> : <Sc4Mark className="setting-sc4" />}
            </span>
          }
        />
      </div>

      {editing === "name" && (
        <NameDialog
          lastName={storedLast}
          firstName={storedFirst}
          onDone={() => {
            setEditing(null);
            setDone("name");
            // The rail and the dashboard both draw this name from the server's
            // copy of the account, which the state above does not touch.
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {editing === "password" && (
        <PasswordDialog
          onDone={() => {
            setEditing(null);
            setDone("password");
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function NameDialog({
  lastName: storedLast,
  firstName: storedFirst,
  onDone,
  onCancel,
}: {
  lastName: string;
  firstName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [lastName, setLastName] = useState(storedLast);
  const [firstName, setFirstName] = useState(storedFirst);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Refusal | null>(null);

  const changed =
    lastName.trim() !== storedLast || firstName.trim() !== storedFirst;
  const complete = lastName.trim() !== "" && firstName.trim() !== "";

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    const refusal = await send("/api/account/profile", "PATCH", {
      lastName: lastName.trim(),
      firstName: firstName.trim(),
    });
    setBusy(false);
    if (refusal) {
      setError(refusal);
      return;
    }
    onDone();
  }

  return (
    <EditModal
      kind="Profile"
      heading="Edit your name"
      description="Family name first, the order sign-up asks for it in."
      submitLabel="Save name"
      busy={busy}
      disabled={!changed || !complete}
      error={error?.error ?? null}
      onSubmit={() => void save()}
      onCancel={onCancel}
    >
      <label className="field">
        <span className="field-label">Last name</span>
        <input
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          className={error?.field === "lastName" ? "is-invalid" : undefined}
          autoComplete="family-name"
          disabled={busy}
        />
      </label>

      <label className="field">
        <span className="field-label">First name</span>
        <input
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          className={error?.field === "firstName" ? "is-invalid" : undefined}
          autoComplete="given-name"
          disabled={busy}
        />
      </label>
    </EditModal>
  );
}

/**
 * Only ever opened for an account that has a password, so there is no
 * set-a-password branch in here: the pencil that would have reached it is not
 * rendered.
 */
function PasswordDialog({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Refusal | null>(null);

  // Caught here so it costs no round trip; the two are never sent apart, so
  // the server has nothing to compare and does not try.
  const mismatch = confirm !== "" && next !== confirm;
  const complete = current !== "" && next !== "" && confirm !== "";

  async function save(): Promise<void> {
    if (mismatch) {
      setError({ error: PASSWORD_MISMATCH, field: "confirm" });
      return;
    }
    if (!isPasswordValid(next)) {
      setError({ error: PASSWORD_RULE, field: "next" });
      return;
    }

    setBusy(true);
    setError(null);
    const refusal = await send("/api/account/password", "POST", {
      current,
      next,
    });
    setBusy(false);
    if (refusal) {
      setError(refusal);
      return;
    }
    onDone();
  }

  return (
    <EditModal
      kind="Security"
      heading="Change your password"
      description="Every other session is signed out when this succeeds. This one stays."
      submitLabel="Change password"
      busy={busy}
      disabled={!complete || mismatch}
      error={error?.error ?? null}
      onSubmit={() => void save()}
      onCancel={onCancel}
    >
      <label className="field field-wide">
        <span className="field-label">Current password</span>
        <input
          type="password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={error?.field === "current" ? "is-invalid" : undefined}
          autoComplete="current-password"
          disabled={busy}
        />
        <span className="field-hint">
          A signed-in tab says this browser was signed in at some point, which
          an unattended laptop also says. This is what says it is you.
        </span>
      </label>

      <label className="field">
        <span className="field-label">New password</span>
        <input
          type="password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className={error?.field === "next" ? "is-invalid" : undefined}
          autoComplete="new-password"
          disabled={busy}
        />
        <span className="field-hint">{PASSWORD_RULE}</span>
      </label>

      <label className="field">
        <span className="field-label">Confirm</span>
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={
            mismatch || error?.field === "confirm" ? "is-invalid" : undefined
          }
          autoComplete="new-password"
          disabled={busy}
        />
        {mismatch && <span className="field-error">{PASSWORD_MISMATCH}</span>}
      </label>
    </EditModal>
  );
}
