import Link from "next/link";

import { formatLatency, formatSpeed } from "@/lib/format";
import type { SharedResult } from "@/lib/server/results";

import { DownloadIcon, JitterIcon, PingIcon, UploadIcon } from "./Icons";
import { ResultActions } from "./ResultActions";
import styles from "./ResultView.module.css";

export interface ResultViewProps {
  result: SharedResult;
  basePath: string;
}

/**
 * A stored result, rendered on the server.
 *
 * Server-rendered rather than fetched on the client so that a shared link is
 * readable the instant it opens — including by anything that does not run
 * JavaScript, which is most of what follows a pasted URL.
 */
export function ResultView({ result, basePath }: ResultViewProps) {
  const context = [result.isp, result.server, result.addressFamily].filter(Boolean);
  const stamp = new Date(result.timestamp);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Speed test result</h1>
          <p className={styles.stamp}>
            <time dateTime={result.timestamp}>
              {Number.isNaN(stamp.getTime()) ? result.timestamp : stamp.toUTCString()}
            </time>
          </p>
        </div>
        <span className={styles.id}>{result.id}</span>
      </header>

      <div className={styles.speeds}>
        <div className={styles.speed} data-kind="download">
          <span className={styles.speedLabel}>
            <DownloadIcon />
            Download
          </span>
          <span className={`${styles.speedValue} num`}>{formatSpeed(result.download)}</span>
          <span className={styles.speedUnit}>Mbps</span>
        </div>
        <div className={styles.speed} data-kind="upload">
          <span className={styles.speedLabel}>
            <UploadIcon />
            Upload
          </span>
          <span className={`${styles.speedValue} num`}>{formatSpeed(result.upload)}</span>
          <span className={styles.speedUnit}>Mbps</span>
        </div>
      </div>

      <dl className={styles.latency}>
        <div className={styles.latencyItem}>
          <dt>
            <PingIcon /> Ping
          </dt>
          <dd className="num">
            {formatLatency(result.ping)} <span>ms</span>
          </dd>
        </div>
        <div className={styles.latencyItem}>
          <dt>
            <JitterIcon /> Jitter
          </dt>
          <dd className="num">
            {formatLatency(result.jitter)} <span>ms</span>
          </dd>
        </div>
      </dl>

      {context.length > 0 ? (
        <p className={styles.context}>{context.join("  ·  ")}</p>
      ) : null}

      <ResultActions resultId={result.id} basePath={basePath} />

      <Link href="/" className={styles.cta}>
        Run your own test
      </Link>
    </article>
  );
}
