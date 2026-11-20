"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { swapChild } from "@/lib/motion";
import { DrawnCheck } from "./DrawnCheck";
import { useToast } from "./Toast";

// Copy button for Docs code blocks: Copy icon morphs to a drawn check on
// success, and a toast confirms it. Renders inside the .code-wrap (position
// relative) of a <pre className="code">.
export function CodeCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* copy failed — nothing more to do */
      }
      ta.remove();
    }
    setCopied(true);
    toast("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="code-copy" onClick={copy} aria-label={copied ? "Copied" : "Copy code"}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          variants={swapChild}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {copied ? (
            <>
              <DrawnCheck size={13} />
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
