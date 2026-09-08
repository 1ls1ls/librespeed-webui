/**
 * Ambient types for the LibreSpeed measurement core, which is loaded as a
 * classic script from /librespeed/speedtest.js and installs a global. It is
 * vendored rather than reimplemented: the timing, grace periods, multi-stream
 * accounting and overhead compensation in that file are the part of a speed
 * test that is genuinely hard to get right, and this project has no reason to
 * have its own opinion about them.
 */

import type { TestServer } from "@/lib/types";

/** Raw status payload the worker posts on every poll. All values are strings. */
export interface SpeedtestUpdate {
  testState: number; // -1 idle, 0 starting, 1 download, 2 ping, 3 upload, 4 done, 5 aborted
  dlStatus: string;
  ulStatus: string;
  pingStatus: string;
  jitterStatus: string;
  clientIp: string;
  dlProgress: number;
  ulProgress: number;
  pingProgress: number;
  testId: string | null;
}

export interface SpeedtestInstance {
  getState(): number;
  setParameter(name: string, value: unknown): void;
  addTestPoint(server: TestServer): void;
  addTestPoints(servers: TestServer[]): void;
  setSelectedServer(server: TestServer): void;
  getSelectedServer(): TestServer;
  selectServer(callback: (best: TestServer | null) => void): void;
  start(): void;
  abort(): void;
  onupdate: ((data: SpeedtestUpdate) => void) | null;
  onend: ((aborted: boolean) => void) | null;
}

export interface SpeedtestConstructor {
  new (): SpeedtestInstance;
  /** Local addition: lets the core find its worker under /librespeed/. */
  WORKER_URL: string;
}

declare global {
  interface Window {
    Speedtest?: SpeedtestConstructor;
  }
}

export {};
