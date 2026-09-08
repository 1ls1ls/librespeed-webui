"use client";

import { useEffect, useState } from "react";

import { useCopy } from "@/hooks/useCopy";
import type { SpeedtestResult } from "@/lib/types";

import { CheckIcon, CopyIcon, ImageIcon, ShareIcon } from "./Icons";
import { Modal } from "./Modal";
import styles from "./SharePanel.module.css";

export interface SharePanelProps {
  result: SpeedtestResult;
  basePath: string;
}

/**
 * Post-run sharing.
 *
 * A result is only shareable once telemetry has stored it and handed back an
 * id, so this appears only when there is something at a stable address to point
 * at. Without that id there is no link to give, and offering one would be a lie.
 */
export function SharePanel({ result, basePath }: SharePanelProps) {
  const [copied, copy] = useCopy();
  const [imageOpen, setImageOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  // Read after mount: the server has no idea which hostname the user typed, and
  // rendering a guess would produce links that work only from one machine.
  useEffect(() => setOrigin(window.location.origin), []);

  if (!result.id) return null;

  const resultUrl = `${origin}${basePath}/result/${result.id}`;
  const imageUrl = `${origin}${basePath}/result/${result.id}/image`;

  const share = () => {
    if (navigator.share) {
      navigator
        .share({ title: "Speed test result", url: resultUrl })
        .catch(() => copy(resultUrl));
    } else {
      copy(resultUrl);
    }
  };

  return (
    <section className={styles.panel} aria-label="Share this result">
      <div className={styles.linkRow}>
        <span className={styles.linkLabel}>Result</span>
        <a className={styles.link} href={resultUrl || "#"}>
          {resultUrl || "…"}
        </a>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={() => copy(resultUrl)}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy link"}
        </button>

        <button type="button" className={styles.action} onClick={() => setImageOpen(true)}>
          <ImageIcon />
          Image
        </button>

        <button type="button" className={styles.action} onClick={share}>
          <ShareIcon />
          Share
        </button>
      </div>

      <Modal open={imageOpen} title="Share image" onClose={() => setImageOpen(false)}>
        <div className={styles.imageWrap}>
          {/* Rendered on demand by the server, so it always reflects what is
              actually stored rather than what this browser happens to remember. */}
          {imageOpen && origin ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className={styles.image} src={imageUrl} alt="Speed test result card" />
          ) : null}
        </div>
        <div className={styles.imageActions}>
          <button type="button" className={styles.action} onClick={() => copy(imageUrl)}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy image link"}
          </button>
          <a className={styles.action} href={imageUrl} download={`speedtest-${result.id}.png`}>
            <ImageIcon />
            Download
          </a>
        </div>
      </Modal>
    </section>
  );
}
