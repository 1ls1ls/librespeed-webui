"use client";

import { formatSpeed } from "@/lib/format";
import type { TestPhase } from "@/lib/types";

import { DownloadIcon, UploadIcon } from "./Icons";
import styles from "./SpeedTiles.module.css";

export interface SpeedTilesProps {
  download: number;
  upload: number;
  phase: TestPhase;
  /** Dims both tiles until a test has actually produced something. */
  hasData: boolean;
}

interface TileProps {
  kind: "download" | "upload";
  label: string;
  value: number;
  active: boolean;
  measured: boolean;
  icon: React.ReactNode;
}

function Tile({ kind, label, value, active, measured, icon }: TileProps) {
  return (
    <div className={styles.tile} data-kind={kind} data-active={active || undefined}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.label}>{label}</span>
        <span className={styles.unit}>Mbps</span>
      </div>
      <div className={`${styles.value} num`}>
        {measured ? formatSpeed(value) : <span className={styles.placeholder}>&mdash;</span>}
      </div>
    </div>
  );
}

/**
 * The pair of headline figures above the dial.
 *
 * Both stay on screen for the whole run, with the one currently being measured
 * lit and the other held back. Showing them together is what lets the finished
 * result be read without any change of layout — the numbers simply stop moving.
 */
export function SpeedTiles({ download, upload, phase, hasData }: SpeedTilesProps) {
  return (
    <div className={styles.tiles}>
      <Tile
        kind="download"
        label="Download"
        value={download}
        active={phase === "download"}
        measured={hasData && (download > 0 || phase === "download")}
        icon={<DownloadIcon />}
      />
      <Tile
        kind="upload"
        label="Upload"
        value={upload}
        active={phase === "upload"}
        measured={hasData && (upload > 0 || phase === "upload")}
        icon={<UploadIcon />}
      />
    </div>
  );
}
