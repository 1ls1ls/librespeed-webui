"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { clearHistory, readHistory } from "@/lib/client/history";
import { formatLatency, formatSpeed, formatTimestamp } from "@/lib/format";
import type { SpeedtestResult } from "@/lib/types";

import { DownloadIcon, UploadIcon } from "./Icons";
import styles from "./HistoryList.module.css";

/**
 * Recent runs from this browser.
 *
 * Read after mount rather than during render, because localStorage does not
 * exist on the server and rendering an empty list first would otherwise cause a
 * hydration mismatch on every visit that has history.
 */
export function HistoryList() {
  const [history, setHistory] = useState<SpeedtestResult[] | null>(null);

  useEffect(() => setHistory(readHistory()), []);

  if (history === null) {
    return <p className={styles.empty}>Loading…</p>;
  }

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No tests yet on this device.</p>
        <Link href="/" className={styles.cta}>
          Run one now
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {history.map((entry, index) => (
          <li key={`${entry.timestamp}-${index}`} className={styles.row}>
            <div className={styles.when}>
              <span className={styles.date}>{formatTimestamp(entry.timestamp)}</span>
              {entry.server ? <span className={styles.server}>{entry.server}</span> : null}
            </div>

            <div className={styles.figures}>
              <span className={styles.figure} data-kind="download">
                <DownloadIcon />
                <b className="num">{formatSpeed(entry.download)}</b>
                <i>Mbps</i>
              </span>
              <span className={styles.figure} data-kind="upload">
                <UploadIcon />
                <b className="num">{formatSpeed(entry.upload)}</b>
                <i>Mbps</i>
              </span>
              <span className={styles.figure}>
                <b className="num">{formatLatency(entry.ping)}</b>
                <i>ms</i>
              </span>
            </div>

            {entry.id ? (
              <Link href={`/result/${entry.id}`} className={styles.open}>
                Open
              </Link>
            ) : (
              <span className={styles.notShared} title="This run was not stored on the server">
                Local
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={styles.clear}
        onClick={() => {
          clearHistory();
          setHistory([]);
        }}
      >
        Clear history
      </button>
    </>
  );
}
