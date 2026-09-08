import type { TestServer } from "./types";

/**
 * Everything the browser half of the app needs to know. It is resolved on the
 * server from environment variables and handed to the client as props, rather
 * than inlined at build time through NEXT_PUBLIC_*, so an operator can retune a
 * deployed instance by restarting the container instead of rebuilding it.
 */
export interface AppConfig {
  brandName: string;
  tagline: string;

  /** Whether results are POSTed to /api/telemetry at all. */
  telemetryEnabled: boolean;
  /** basic = results only, full = results + timings, debug = + worker log. */
  telemetryLevel: "basic" | "full" | "debug";
  /** Whether finished runs offer a shareable link and image. */
  shareEnabled: boolean;
  /** Whether to ask /api/getIP to resolve the ISP behind the address. */
  ispInfo: boolean;

  /**
   * Selectable endpoints. Empty means single-server mode against this origin,
   * which is the common intranet case and needs no configuration at all.
   */
  servers: TestServer[];

  test: TestParameters;
}

/** Knobs passed straight through to the LibreSpeed worker. */
export interface TestParameters {
  /** D=download, U=upload, P=ping+jitter, I=fetch IP, _=one second pause. */
  order: string;
  durationDownload: number;
  durationUpload: number;
  /** Ends early on fast links so a gigabit test does not idle at full speed. */
  autoDuration: boolean;
  /** Seconds discarded at the start of each phase while buffers fill. */
  graceDownload: number;
  graceUpload: number;
  pingCount: number;
  streamsDownload: number;
  streamsUpload: number;
  /** MiB requested per download request. */
  chunkSize: number;
  /** Scales measured bytes to account for TCP/IP framing. */
  overheadCompensation: number;
}

export const DEFAULT_TEST: TestParameters = {
  order: "I_P_D_U",
  durationDownload: 15,
  durationUpload: 15,
  autoDuration: true,
  graceDownload: 1.5,
  graceUpload: 3,
  pingCount: 10,
  streamsDownload: 6,
  streamsUpload: 3,
  chunkSize: 100,
  overheadCompensation: 1.06,
};

export const DEFAULT_CONFIG: AppConfig = {
  brandName: "LibreSpeed",
  tagline: "Speed Test",
  telemetryEnabled: true,
  telemetryLevel: "basic",
  shareEnabled: true,
  ispInfo: true,
  servers: [],
  test: DEFAULT_TEST,
};

/** Endpoints this app exposes, in the shape LibreSpeed's worker expects. */
export const LOCAL_ENDPOINTS = {
  dlURL: "api/garbage",
  ulURL: "api/empty",
  pingURL: "api/empty",
  getIpURL: "api/getIP",
  telemetryURL: "api/telemetry",
} as const;
