/** Phases of a run, matching the numeric `testState` the LibreSpeed worker reports. */
export type TestPhase =
  | "idle" // -1, nothing started
  | "starting" // 0
  | "download" // 1
  | "ping" // 2
  | "upload" // 3
  | "done" // 4
  | "aborted"; // 5

/** A single measurement, as displayed and as stored. */
export interface SpeedtestResult {
  /** Server-assigned share id; absent when telemetry is disabled or failed. */
  id?: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  /** Human-readable "IP - ISP, Country" string from /api/getIP. */
  client?: string;
  /** Friendly name of the server the test ran against. */
  server?: string;
  /** ISO 8601. */
  timestamp: string;
}

/** Live state pushed out of the measurement engine on every tick. */
export interface LiveState {
  phase: TestPhase;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  downloadProgress: number;
  uploadProgress: number;
  pingProgress: number;
  client: string;
  /** Set once telemetry has accepted the run. */
  resultId: string | null;
}

/** A selectable measurement endpoint (multi-server deployments). */
export interface TestServer {
  name: string;
  server: string;
  dlURL: string;
  ulURL: string;
  pingURL: string;
  getIpURL: string;
  /** Measured during selection; -1 when unreachable. */
  pingT?: number;
}

/** Shape returned by /api/getIP. */
export interface IpInfoResponse {
  processedString: string;
  rawIspInfo: Record<string, unknown> | "";
}
