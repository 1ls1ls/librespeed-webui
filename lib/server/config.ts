import "server-only";

import { readFileSync } from "node:fs";
import { DEFAULT_CONFIG, DEFAULT_TEST, type AppConfig, type TestParameters } from "@/lib/config";
import type { TestServer } from "@/lib/types";

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

function num(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : raw;
}

/**
 * Reads the server list from either inline JSON or a path to a JSON file. A
 * malformed list degrades to single-server mode rather than taking the page
 * down: a speed test that still measures something is worth more than a stack
 * trace about configuration.
 */
function loadServers(): TestServer[] {
  const raw = process.env.SPEEDTEST_SERVERS;
  if (!raw) return [];

  let text = raw.trim();
  try {
    if (!text.startsWith("[")) text = readFileSync(text, "utf8");
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("server list must be a JSON array");

    return parsed.filter((entry): entry is TestServer => {
      const s = entry as Partial<TestServer>;
      const ok =
        typeof s?.name === "string" &&
        typeof s?.server === "string" &&
        typeof s?.dlURL === "string" &&
        typeof s?.ulURL === "string" &&
        typeof s?.pingURL === "string" &&
        typeof s?.getIpURL === "string";
      if (!ok) console.warn("[config] ignoring malformed server entry:", entry);
      return ok;
    });
  } catch (err) {
    console.warn("[config] SPEEDTEST_SERVERS could not be read, falling back to this origin:", err);
    return [];
  }
}

function loadTestParameters(): TestParameters {
  return {
    order: str("SPEEDTEST_ORDER", DEFAULT_TEST.order),
    durationDownload: num("SPEEDTEST_DL_DURATION", DEFAULT_TEST.durationDownload, 1, 120),
    durationUpload: num("SPEEDTEST_UL_DURATION", DEFAULT_TEST.durationUpload, 1, 120),
    autoDuration: bool("SPEEDTEST_AUTO_DURATION", DEFAULT_TEST.autoDuration),
    graceDownload: num("SPEEDTEST_DL_GRACE", DEFAULT_TEST.graceDownload, 0, 30),
    graceUpload: num("SPEEDTEST_UL_GRACE", DEFAULT_TEST.graceUpload, 0, 30),
    pingCount: num("SPEEDTEST_PING_COUNT", DEFAULT_TEST.pingCount, 1, 100),
    streamsDownload: num("SPEEDTEST_DL_STREAMS", DEFAULT_TEST.streamsDownload, 1, 32),
    streamsUpload: num("SPEEDTEST_UL_STREAMS", DEFAULT_TEST.streamsUpload, 1, 32),
    chunkSize: num("SPEEDTEST_CHUNK_SIZE", DEFAULT_TEST.chunkSize, 1, 1024),
    overheadCompensation: num("SPEEDTEST_OVERHEAD", DEFAULT_TEST.overheadCompensation, 1, 2),
  };
}

function telemetryLevel(): AppConfig["telemetryLevel"] {
  const raw = str("SPEEDTEST_TELEMETRY_LEVEL", DEFAULT_CONFIG.telemetryLevel).toLowerCase();
  return raw === "full" || raw === "debug" ? raw : "basic";
}

/** Resolves the live configuration. Call per request; it is cheap and uncached
 *  on purpose so environment changes take effect on restart without a rebuild. */
export function getAppConfig(): AppConfig {
  const telemetryEnabled = bool("SPEEDTEST_TELEMETRY", DEFAULT_CONFIG.telemetryEnabled);
  return {
    brandName: str("SPEEDTEST_BRAND_NAME", DEFAULT_CONFIG.brandName),
    tagline: str("SPEEDTEST_TAGLINE", DEFAULT_CONFIG.tagline),
    telemetryEnabled,
    telemetryLevel: telemetryLevel(),
    // Sharing is meaningless without a stored result to point at.
    shareEnabled: telemetryEnabled && bool("SPEEDTEST_SHARE", DEFAULT_CONFIG.shareEnabled),
    ispInfo: bool("SPEEDTEST_ISP_INFO", DEFAULT_CONFIG.ispInfo),
    servers: loadServers(),
    test: loadTestParameters(),
  };
}

/** Whether IP addresses should be scrubbed before they reach the database. */
export function redactIpAddresses(): boolean {
  return bool("SPEEDTEST_REDACT_IP", false);
}

/** Whether X-Forwarded-For / X-Real-IP from upstream may be believed. */
export function trustProxy(): boolean {
  return bool("TRUST_PROXY", false);
}

/**
 * The subdirectory this instance is served from, if any.
 *
 * Unlike the rest of the configuration this one is fixed at build time, because
 * Next rewrites asset URLs against it while compiling. It is read here as well
 * so the client can build absolute endpoint and share URLs from the same value.
 */
export function basePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}
