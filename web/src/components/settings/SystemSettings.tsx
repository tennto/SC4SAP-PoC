"use client";

/**
 * The one SAP panel: which system the backend is pointed at, and what that
 * system is.
 *
 * It shows the live profile and nothing else. There used to be a second card
 * beside it, the connection this account typed into setup, carrying the same
 * four facts — host, user, client, release — from a source nothing runs on.
 * The two disagreed the moment anyone switched systems, and the one that
 * looked authoritative was the wrong one. The stored record still exists and
 * the dashboard's reconnect check still probes it; it is simply not a second
 * answer to "which SAP am I on".
 *
 * The plus in the head goes to `/setup/system`, which proves a logon before
 * it writes a profile and switches onto it.
 *
 * A select that saves on pick, like the approval row: the choice is one of a
 * handful of named systems, and a dialog to pick one of three would be a step
 * for nothing.
 *
 * It is not an account setting and is not drawn as one. The workspace is a
 * single directory every session shares, so this switches the system for the
 * whole backend — other people's sessions included, which is why the hint says
 * so before the pick rather than after it. The rows under the select are the
 * chosen system's host, client and user, so the thing being switched to is
 * legible without opening another screen.
 *
 * The select shows the pending alias while the request is in flight and falls
 * back to the previous one if it fails, so the row never claims a system the
 * backend is not actually on.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { SettingRow } from "@/components/settings/EditModal";
import { useLocale } from "@/lib/i18n/client";
import type { ProfileList, SapProfile } from "@/lib/types";

export function SystemSettings({ initial }: { initial: ProfileList | null }) {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.settings;
  const [asking, setAsking] = useState(false);

  const [profiles, setProfiles] = useState<SapProfile[]>(
    initial?.profiles ?? [],
  );
  const [active, setActive] = useState<string>(initial?.active ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pick(next: string): Promise<void> {
    if (next === active || busy) return;
    const previous = active;
    setActive(next);
    setBusy(true);
    setNote(t.systemSwitching);
    try {
      const response = await fetch("/api/profiles/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: next }),
      });
      const body = (await response.json().catch(() => null)) as
        | (ProfileList & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? t.serverAnswered(response.status));
      }
      if (body?.profiles) setProfiles(body.profiles);
      setActive(body?.active ?? next);
      // The backend closes every open session as part of the switch. Say how
      // many, because a reader whose chat list just emptied is owed the reason.
      setNote(t.systemSwitched(body?.active ?? next, closedCount(body)));
    } catch (err) {
      setActive(previous);
      setNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const current = profiles.find((p) => p.alias === active);

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <div>
          <h2>
            <Icon name="database" /> {t.systems}
          </h2>
          <p className="panel-note">{t.systemsNote}</p>
        </div>
        {/* Asks before it navigates. Adding a system is a form on another
            screen and ends by switching onto it, which closes every open
            session — too much to sit behind a bare icon on a settings row. */}
        <button
          type="button"
          className="icon-button"
          onClick={() => setAsking(true)}
          aria-label={t.addSystemConfirm}
          title={t.addSystemConfirm}
        >
          <i className="ph ph-plus" aria-hidden="true" />
        </button>
      </div>

      {initial === null ? (
        <p className="field-note">{t.systemsUnavailable}</p>
      ) : profiles.length === 0 ? (
        <p className="field-note">{t.noSystems}</p>
      ) : (
        <div className="setting-rows">
          <SettingRow
            label={t.activeSystem}
            value={
              <div className="system-pick">
                <Select
                  name="sapProfile"
                  value={active}
                  options={profiles.map((p) => ({
                    value: p.alias,
                    label: p.description
                      ? `${p.alias} · ${p.description}`
                      : p.alias,
                  }))}
                  onChange={(next) => void pick(next)}
                  disabled={busy}
                />
              </div>
            }
            hint={note ?? t.systemHint}
          />
          {current && (
            <>
              <SettingRow label={t.adtUrl} value={current.host} />
              <SettingRow
                label={t.client}
                value={`${current.client} · ${current.tier}`}
              />
              <SettingRow
                label={t.systemUser}
                value={current.username}
                hint={
                  current.passwordInKeychain
                    ? undefined
                    : t.systemPasswordPlaintext
                }
              />
              <SettingRow label={t.release} value={current.abapRelease} />
            </>
          )}

        </div>
      )}

      {asking && (
        <ConfirmModal
          kind={t.systems}
          heading={t.addSystemHeading}
          description={t.addSystemBody}
          confirmLabel={t.addSystemConfirm}
          confirmIcon="plus"
          note={t.systemHint}
          onConfirm={() => router.push("/setup/system")}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}

/**
 * How many sessions the switch closed.
 *
 * The backend reports it in its log line and returns the new list; the count
 * rides along when it is there and is treated as zero when it is not, so an
 * older backend still gets a sentence rather than "undefined sessions closed".
 */
function closedCount(body: (ProfileList & { closedSessions?: number }) | null): number {
  const n = body?.closedSessions;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}
