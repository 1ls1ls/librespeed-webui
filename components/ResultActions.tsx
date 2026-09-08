"use client";

import { useEffect, useState } from "react";

import { useCopy } from "@/hooks/useCopy";

import { CheckIcon, CopyIcon, ImageIcon } from "./Icons";
import styles from "./ResultView.module.css";

export interface ResultActionsProps {
  resultId: string;
  basePath: string;
}

/**
 * The interactive strip on an otherwise server-rendered result page.
 *
 * Split out as its own client component so the result itself stays server
 * HTML — the numbers are readable before any JavaScript arrives, and only the
 * buttons need hydrating.
 */
export function ResultActions({ resultId, basePath }: ResultActionsProps) {
  const [copied, copy] = useCopy();
  const [origin, setOrigin] = useState("");

  // The server cannot know which hostname was used to reach it, and a shared
  // link built from a guess would work only from the machine that made it.
  useEffect(() => setOrigin(window.location.origin), []);

  const resultUrl = `${origin}${basePath}/result/${resultId}`;
  const imageUrl = `${origin}${basePath}/result/${resultId}/image`;

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.action}
        onClick={() => copy(resultUrl)}
        disabled={!origin}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy link"}
      </button>

      <a className={styles.action} href={imageUrl} download={`speedtest-${resultId}.png`}>
        <ImageIcon />
        Download image
      </a>
    </div>
  );
}
