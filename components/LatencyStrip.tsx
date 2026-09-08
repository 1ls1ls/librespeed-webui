"use client";

import { formatLatency } from "@/lib/format";
import type { TestPhase } from "@/lib/types";

import { JitterIcon, PingIcon } from "./Icons";
import styles from "./LatencyStrip.module.css";

export interface LatencyStripProps {
  ping: number;
  jitter: number;
  phase: TestPhase;
  hasData: boolean;
}

/**
 * Latency and jitter, above the headline speeds.
 *
 * They are deliberately smaller than the throughput figures without being
 * hidden: for most people the two big numbers are the answer, but latency is
 * what actually decides whether a call or a game feels right, so it stays
 * visible the whole time rather than living behind a details toggle.
 */
export function LatencyStrip({ ping, jitter, phase, hasData }: LatencyStripProps) {
  const active = phase === "ping";
  const measured = hasData && (ping > 0 || active);

  return (
    <dl className={styles.strip} data-active={active || undefined}>
      <div className={styles.item}>
        <dt className={styles.label}>
          <PingIcon className={styles.icon} />
          Ping
        </dt>
        <dd className={styles.value}>
          <span className="num">{measured ? formatLatency(ping) : "—"}</span>
          <span className={styles.unit}>ms</span>
        </dd>
      </div>

      <span className={styles.divider} aria-hidden="true" />

      <div className={styles.item}>
        <dt className={styles.label}>
          <JitterIcon className={styles.icon} />
          Jitter
        </dt>
        <dd className={styles.value}>
          <span className="num">{measured ? formatLatency(jitter) : "—"}</span>
          <span className={styles.unit}>ms</span>
        </dd>
      </div>
    </dl>
  );
}
