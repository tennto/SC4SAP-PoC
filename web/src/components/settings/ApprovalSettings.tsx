"use client";

/**
 * How much this account's sessions ask before they act.
 *
 * A row with a select rather than a pencil and a dialog: there are three
 * values, each a sentence long, and a dialog to pick one of three is a step
 * for nothing. The change is saved on pick and reported under the row.
 *
 * It applies to the next session opened. One already running keeps the
 * level it started with — a switch that reached into a run in progress
 * would change what an approval dialog on screen meant while it was open.
 */
import { useState } from "react";
import { Select } from "@/components/Select";
import { SettingRow } from "@/components/settings/EditModal";
import { APPROVAL_LEVELS, type ApprovalLevel } from "@/lib/account";

export function ApprovalSettings({ approval }: { approval: ApprovalLevel }) {
  const [level, setLevel] = useState<ApprovalLevel>(approval);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pick(next: ApprovalLevel): Promise<void> {
    if (next === level || busy) return;
    const previous = level;
    setLevel(next);
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/account/approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval: next }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The server answered ${response.status}.`);
      }
      setNote("Saved. Applies to the next session you open.");
    } catch (err) {
      setLevel(previous);
      setNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const current = APPROVAL_LEVELS.find((entry) => entry.value === level);

  return (
    <SettingRow
      label="Approvals"
      value={
        <div className="approval-pick">
          <Select
            name="approval"
            value={level}
            options={APPROVAL_LEVELS.map((entry) => ({ value: entry.value, label: entry.label }))}
            onChange={(next) => void pick(next as ApprovalLevel)}
            disabled={busy}
          />
        </div>
      }
      hint={note ?? current?.hint}
    />
  );
}
