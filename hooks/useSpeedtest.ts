"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LOCAL_ENDPOINTS, type AppConfig } from "@/lib/config";
import { loadEngine } from "@/lib/client/engine-loader";
import { appendHistory } from "@/lib/client/history";
import type { LiveState, SpeedtestResult, TestPhase, TestServer } from "@/lib/types";
import type { SpeedtestInstance, SpeedtestUpdate } from "@/types/librespeed";

/** The worker's numeric testState, named. */
const PHASE_BY_STATE: Record<number, TestPhase> = {
  [-1]: "idle",
  0: "starting",
  1: "download",
  2: "ping",
  3: "upload",
  4: "done",
  5: "aborted",
};

const IDLE: LiveState = {
  phase: "idle",
  download: 0,
  upload: 0,
  ping: 0,
  jitter: 0,
  downloadProgress: 0,
  uploadProgress: 0,
  pingProgress: 0,
  client: "",
  resultId: null,
};

/** Worker figures arrive as strings, and as "Fail" when a phase gave up. */
function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Absolute URLs for the measurement endpoints.
 *
 * They cannot be relative: the worker resolves relative URLs against its own
 * location, which is /librespeed/, so "api/garbage" would become
 * "/librespeed/api/garbage" and every request would 404.
 */
function endpoints(basePath: string) {
  const root = `${window.location.origin}${basePath}`;
  return {
    dl: `${root}/${LOCAL_ENDPOINTS.dlURL}`,
    ul: `${root}/${LOCAL_ENDPOINTS.ulURL}`,
    ping: `${root}/${LOCAL_ENDPOINTS.pingURL}`,
    getIp: `${root}/${LOCAL_ENDPOINTS.getIpURL}`,
    telemetry: `${root}/${LOCAL_ENDPOINTS.telemetryURL}`,
  };
}

export interface UseSpeedtest {
  state: LiveState;
  /** True from the moment start() is called until the run settles. */
  running: boolean;
  /** The finished run, cleared when a new one starts. */
  result: SpeedtestResult | null;
  /** Non-null when the engine could not be loaded or a run failed outright. */
  error: string | null;
  start: () => void;
  abort: () => void;
}

/**
 * Drives one measurement at a time through the LibreSpeed core.
 *
 * A fresh Speedtest object is built per run rather than reusing one: the core
 * is a single-shot state machine whose server selection cannot be repeated, and
 * a new instance is both cheaper and clearer than reasoning about which
 * transitions a used one still allows.
 */
export function useSpeedtest(
  config: AppConfig,
  basePath: string,
  selectedServer: TestServer | null
): UseSpeedtest {
  const [state, setState] = useState<LiveState>(IDLE);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SpeedtestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instanceRef = useRef<SpeedtestInstance | null>(null);
  const latestRef = useRef<LiveState>(IDLE);
  const serverRef = useRef<TestServer | null>(selectedServer);
  serverRef.current = selectedServer;

  // Abort an in-flight run if the component goes away, so the worker and its
  // half-dozen open sockets do not outlive the page that started them.
  useEffect(() => {
    return () => {
      try {
        instanceRef.current?.abort();
      } catch {
        /* already finished */
      }
    };
  }, []);

  const applySettings = useCallback(
    (test: SpeedtestInstance) => {
      const url = endpoints(basePath);
      const server = serverRef.current;

      /*
       * Multi-server mode has to go through addTestPoints before a server is
       * chosen: that is what sets the core's `mpot` flag, which in turn makes it
       * compose endpoint URLs from the server entry and send cross-origin
       * requests with the CORS opt-in the endpoints expect.
       */
      if (config.servers.length > 0 && server) {
        test.addTestPoints(config.servers);
        test.setSelectedServer(server);
      } else {
        test.setParameter("url_dl", url.dl);
        test.setParameter("url_ul", url.ul);
        test.setParameter("url_ping", url.ping);
        test.setParameter("url_getIp", url.getIp);
      }

      const { test: params } = config;
      test.setParameter("test_order", params.order);
      test.setParameter("time_dl_max", params.durationDownload);
      test.setParameter("time_ul_max", params.durationUpload);
      test.setParameter("time_auto", params.autoDuration);
      test.setParameter("time_dlGraceTime", params.graceDownload);
      test.setParameter("time_ulGraceTime", params.graceUpload);
      test.setParameter("count_ping", params.pingCount);
      test.setParameter("xhr_dlMultistream", params.streamsDownload);
      test.setParameter("xhr_ulMultistream", params.streamsUpload);
      test.setParameter("garbagePhp_chunkSize", params.chunkSize);
      test.setParameter("overheadCompensationFactor", params.overheadCompensation);

      test.setParameter("getIp_ispInfo", config.ispInfo);
      /*
       * Distance estimation stays off. Upstream computes it from coordinates
       * fetched from a third-party lookup service, which is exactly the kind of
       * outbound call this deployment cannot make; asking for it would only add
       * a parameter the local endpoint ignores.
       */
      test.setParameter("getIp_ispInfo_distance", false);

      if (config.telemetryEnabled) {
        test.setParameter("telemetry_level", config.telemetryLevel);
        test.setParameter("url_telemetry", url.telemetry);
        // In single-server mode the core leaves this untouched, so naming the
        // server here keeps stored results labelled either way.
        if (!server) {
          test.setParameter("telemetry_extra", JSON.stringify({ server: config.brandName }));
        }
      } else {
        test.setParameter("telemetry_level", 0);
      }
    },
    [basePath, config]
  );

  const start = useCallback(() => {
    if (running) return;

    setError(null);
    setResult(null);
    setState(IDLE);
    latestRef.current = IDLE;
    setRunning(true);

    loadEngine(basePath)
      .then((Speedtest) => {
        const test = new Speedtest();
        instanceRef.current = test;
        applySettings(test);

        test.onupdate = (data: SpeedtestUpdate) => {
          const next: LiveState = {
            phase: PHASE_BY_STATE[data.testState] ?? "idle",
            download: toNumber(data.dlStatus),
            upload: toNumber(data.ulStatus),
            ping: toNumber(data.pingStatus),
            jitter: toNumber(data.jitterStatus),
            downloadProgress: data.dlProgress ?? 0,
            uploadProgress: data.ulProgress ?? 0,
            pingProgress: data.pingProgress ?? 0,
            client: data.clientIp ?? "",
            resultId: data.testId ?? null,
          };
          latestRef.current = next;
          setState(next);
        };

        test.onend = (aborted: boolean) => {
          setRunning(false);
          const final = latestRef.current;

          if (aborted) {
            setState({ ...final, phase: "aborted" });
            return;
          }

          const finished: SpeedtestResult = {
            id: final.resultId ?? undefined,
            download: final.download,
            upload: final.upload,
            ping: final.ping,
            jitter: final.jitter,
            client: final.client,
            server: serverRef.current?.name ?? config.brandName,
            timestamp: new Date().toISOString(),
          };
          setResult(finished);
          appendHistory(finished);
        };

        test.start();
      })
      .catch((err: unknown) => {
        setRunning(false);
        setError(err instanceof Error ? err.message : "The speed test could not be started.");
      });
  }, [applySettings, basePath, config.brandName, running]);

  const abort = useCallback(() => {
    try {
      instanceRef.current?.abort();
    } catch {
      /* not started, or already over */
    }
    setRunning(false);
    setState((current) => ({ ...current, phase: "aborted" }));
  }, []);

  return { state, running, result, error, start, abort };
}
