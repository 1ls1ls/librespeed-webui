"use client";

import { useState } from "react";

import { useClientInfo } from "@/hooks/useClientInfo";
import { useServers } from "@/hooks/useServers";
import { useSpeedtest } from "@/hooks/useSpeedtest";
import type { AppConfig } from "@/lib/config";
import { formatLatency, formatSpeed } from "@/lib/format";

import { ConnectionBar } from "./ConnectionBar";
import { Gauge } from "./Gauge";
import { GoButton, type GoButtonMode } from "./GoButton";
import { LatencyStrip } from "./LatencyStrip";
import { ServerPicker } from "./ServerPicker";
import { SharePanel } from "./SharePanel";
import { SpeedTiles } from "./SpeedTiles";
import styles from "./SpeedTest.module.css";

export interface SpeedTestProps {
  config: AppConfig;
  basePath: string;
}

/** Ambient tint behind the dial, per phase. Empty means no glow at all. */
const GLOW: Record<string, string> = {
  ping: "rgba(0, 224, 215, 0.10)",
  download: "rgba(28, 191, 255, 0.13)",
  upload: "rgba(191, 113, 255, 0.13)",
};

export function SpeedTest({ config, basePath }: SpeedTestProps) {
  const { servers, selected, selecting, select, refresh } = useServers(config, basePath);
  const { state, running, result, error, start, abort } = useSpeedtest(config, basePath, selected);
  const initialClient = useClientInfo(basePath, config.ispInfo);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { phase } = state;
  const finished = Boolean(result) || phase === "aborted";

  /*
   * The dial follows whichever phase is running. During the latency phase it
   * shows milliseconds while the needle stays down, because there is no honest
   * place to point it on a throughput scale.
   */
  const isPing = phase === "ping";
  const isUpload = phase === "upload";
  const readout = isPing ? state.ping : isUpload ? state.upload : state.download;
  const arcValue = isPing ? 0 : isUpload ? state.upload : state.download;

  const mode: GoButtonMode = running ? "starting" : finished ? "again" : "go";

  const serverName = selected?.name ?? config.brandName;

  return (
    <div
      className={styles.stage}
      style={{ "--glow-color": GLOW[phase] ?? "transparent" } as React.CSSProperties}
    >
      <div className={styles.glow} aria-hidden="true" />

      <LatencyStrip
        ping={state.ping}
        jitter={state.jitter}
        phase={phase}
        hasData={running || finished}
      />

      <SpeedTiles
        download={result?.download ?? state.download}
        upload={result?.upload ?? state.upload}
        phase={phase}
        hasData={running || finished}
      />

      <Gauge
        value={readout}
        arcValue={arcValue}
        unit={isPing ? "ms" : "Mbps"}
        format={isPing ? formatLatency : formatSpeed}
        phase={phase}
      >
        <GoButton mode={mode} onClick={running ? abort : start} />
      </Gauge>

      <div className={styles.underDial}>
        {running ? (
          <button type="button" className={styles.cancel} onClick={abort}>
            Cancel test
          </button>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {phase === "aborted" && !error ? (
          <p className={styles.note}>Test cancelled.</p>
        ) : null}
      </div>

      <ConnectionBar
        client={state.client || result?.client || initialClient}
        serverName={serverName}
        serverPing={selected?.pingT}
        onChangeServer={servers.length > 1 ? () => setPickerOpen(true) : undefined}
      />

      {config.shareEnabled && result ? (
        <SharePanel result={result} basePath={basePath} />
      ) : null}

      {/* Telemetry is what mints the share id, so say so rather than leaving a
          finished result looking as though sharing silently failed. */}
      {result && !result.id && config.shareEnabled ? (
        <p className={styles.note}>This result was not stored, so there is no link to share.</p>
      ) : null}

      <ServerPicker
        open={pickerOpen}
        servers={servers}
        selected={selected}
        selecting={selecting}
        onSelect={select}
        onRefresh={refresh}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
