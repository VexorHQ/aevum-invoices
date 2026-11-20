"use client";

import { DrawnCheck } from "./DrawnCheck";

// Animated status badge. Same dot + text language as Round 1, with a
// micro-animation per status so it reads at a glance — and reads the same in
// a still screenshot (the check is drawn, the pulse dot is visible mid-pulse):
//  - paid: green dot replaced by a drawn check (settled)
//  - open: navy dot with a soft pulse (waiting)
//  - overdue: amber dot with a soft pulse (needs attention)
//  - created: plain navy dot (an event, not a state)
//  - warn: amber dot, no pulse (a notice, e.g. "Not paid")
export type BadgeStatus = "open" | "paid" | "overdue" | "created" | "warn";

const DEFAULT_LABEL: Record<BadgeStatus, string> = {
  open: "Open",
  paid: "Paid",
  overdue: "Overdue",
  created: "Created",
  warn: "Warning",
};

export function StatusBadge({ status, label }: { status: BadgeStatus; label?: string }) {
  const tone = status === "paid" ? "good" : status === "overdue" || status === "warn" ? "warn" : "";
  return (
    <span className={`status badge ${tone}`}>
      {status === "paid" ? (
        <span className="badge-check">
          <DrawnCheck size={13} />
        </span>
      ) : (
        <span className={`badge-dot${status === "open" || status === "overdue" ? " pulse" : ""} ${tone}`} aria-hidden="true" />
      )}
      {label ?? DEFAULT_LABEL[status]}
    </span>
  );
}
