const base = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const CheckIcon = () => (
  <svg {...base}><path d="M5 12l5 5L20 7" /></svg>
);
export const WarnIcon = () => (
  <svg {...base}><path d="M12 7v6" /><path d="M12 17h.01" /></svg>
);
export const CrossIcon = () => (
  <svg {...base}><path d="M7 7l10 10M17 7L7 17" /></svg>
);

export const CopyIcon = () => (
  <svg {...base} strokeWidth={2}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const GitHubIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

/** Brand mark: a navy square with a white receipt glyph. No gradient. */
export const ReceiptMark = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
    <rect width="26" height="26" rx="7" fill="#1E3A5F" />
    <path d="M8 5.5h10v15l-1.7-1.2-1.6 1.2-1.7-1.2-1.7 1.2-1.6-1.2L8 20.5v-15z" fill="#fff" />
    <path d="M10.8 9.5h4.4M10.8 12.5h4.4M10.8 15.5h2.8" stroke="#1E3A5F" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** Empty-state motif: simple line-art receipt, domain-tied. */
export const DrawnCheckIcon = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="28" cy="28" r="24" />
    <path d="M17 29l7.5 7.5L39 21" />
  </svg>
);

export const ReceiptIcon = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 6h24v44l-4-3-4 3-4-3-4 3-4-3-4 3V6z" />
    <path d="M22 16h12M22 23h12M22 30h7" />
    <path d="M30 33l2.5 2.5L38 30" stroke="#059669" />
  </svg>
);
