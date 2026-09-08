"use client";

import { ipFromProcessedString, ispFromProcessedString } from "@/lib/format";

import { GlobeIcon, ServerIcon } from "./Icons";
import styles from "./ConnectionBar.module.css";

export interface ConnectionBarProps {
  /** The raw "1.2.3.4 - Example ISP, US" string from /api/getIP. */
  client: string;
  serverName: string;
  serverPing?: number;
  /** Omitted in single-server deployments, where there is nothing to change to. */
  onChangeServer?: () => void;
}

/**
 * Who is being measured, and against what.
 *
 * Both halves matter for reading a result: a number without the endpoint it was
 * measured against is not reproducible, and on a multi-server install the
 * chosen server is the single biggest reason two results differ.
 */
export function ConnectionBar({
  client,
  serverName,
  serverPing,
  onChangeServer,
}: ConnectionBarProps) {
  const isp = ispFromProcessedString(client);
  const ip = ipFromProcessedString(client);

  return (
    <div className={styles.bar}>
      <div className={styles.side}>
        <span className={styles.badge} aria-hidden="true">
          <GlobeIcon />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{isp || "Connection"}</span>
          <span className={styles.detail}>{ip || "Detecting…"}</span>
        </span>
      </div>

      <span className={styles.rule} aria-hidden="true" />

      <div className={`${styles.side} ${styles.right}`}>
        <span className={styles.text}>
          <span className={styles.title}>{serverName}</span>
          {onChangeServer ? (
            <button type="button" className={styles.change} onClick={onChangeServer}>
              Change server
            </button>
          ) : (
            <span className={styles.detail}>
              {typeof serverPing === "number" && serverPing >= 0
                ? `${Math.round(serverPing)} ms away`
                : "This server"}
            </span>
          )}
        </span>
        <span className={styles.badge} aria-hidden="true">
          <ServerIcon />
        </span>
      </div>
    </div>
  );
}
