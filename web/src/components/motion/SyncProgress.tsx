"use client";

import { AnimatedNumber } from "./AnimatedNumber";

// On-chain sync moment (dashboard + activity): a progress bar with a
// shimmering energy beam at its leading edge, a rolling percentage counter
// (tabular-nums, no digit jitter), and shimmer skeleton rows while the first
// chunk of blocks is still being read. The width transition is CSS (0.2s);
// the beam pulse and the skeleton shimmer are transform/opacity only.
export function SyncProgress({ progress, label }: { progress: number; label: string }) {
  return (
    <div aria-live="polite">
      <div className="progress sync-beam" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="fine" style={{ marginTop: 8 }}>
        {label} <AnimatedNumber value={Math.round(progress)} suffix="%" />
      </p>
    </div>
  );
}

const SK_WIDTHS = ["120px", "90px", "70px", "60px", "80px"];

export function InvoiceSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {SK_WIDTHS.map((w, j) => (
            <span key={j} className="sk" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TimelineSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="timeline skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="tl-item">
          <span className="tl-dot" />
          <div className="tl-body">
            <div className="skeleton-row" style={{ borderBottom: 0, padding: 0 }}>
              <span className="sk" style={{ width: 110 }} />
              <span className="sk" style={{ width: 70 }} />
            </div>
            <div className="skeleton-row" style={{ borderBottom: 0, padding: "8px 0 0" }}>
              <span className="sk" style={{ width: 200 }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
