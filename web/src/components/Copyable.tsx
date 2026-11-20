"use client";

import { useState } from "react";

// Truncated hash/id + copy button. Fixes the Round 1 issue where a 66-char
// id wrapped mid-string in the receipt kv. Full value stays in `title`.
export function truncateHash(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function Copyable({ value, href }: { value: string; href?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (http / old browser): legacy fallback.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* copy failed — leave the value selectable in title */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const display = truncateHash(value);
  return (
    <span className="copyable">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" title={value}>
          {display}
        </a>
      ) : (
        <span title={value}>{display}</span>
      )}
      <button type="button" className="copy-btn" onClick={copy} aria-label={copied ? "Copied" : `Copy ${value}`}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
