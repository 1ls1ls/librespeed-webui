"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Copy-to-clipboard with a short "copied" confirmation.
 *
 * The legacy execCommand path is kept deliberately: navigator.clipboard is
 * unavailable on insecure origins, and plain HTTP on an internal hostname is
 * exactly how these deployments are usually reached. Without the fallback,
 * copying a share link would silently do nothing on the network this app is
 * built for.
 */
export function useCopy(resetAfterMs = 1800): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), resetAfterMs);
    return () => window.clearTimeout(timer);
  }, [copied, resetAfterMs]);

  const copy = useCallback((text: string) => {
    const viaSelection = () => {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.top = "0";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      } finally {
        document.body.removeChild(field);
      }
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => setCopied(true), viaSelection);
    } else {
      viaSelection();
    }
  }, []);

  return [copied, copy];
}
