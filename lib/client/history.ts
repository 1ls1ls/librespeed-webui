import type { SpeedtestResult } from "@/lib/types";

/*
 * Recent runs, kept in the browser.
 *
 * Deliberately local rather than a query against the telemetry table: that
 * table is keyed by nothing the browser can prove it owns, so "my results"
 * could only ever mean "results from my IP address", which is both wrong on a
 * shared network and a way to read other people's measurements. Local storage
 * gives an honest per-browser history, and anything worth keeping beyond that
 * has a share link.
 */

const KEY = "speedtest.history.v1";
const LIMIT = 25;

function isResult(value: unknown): value is SpeedtestResult {
  const r = value as Partial<SpeedtestResult> | null;
  return (
    !!r &&
    typeof r === "object" &&
    typeof r.download === "number" &&
    typeof r.upload === "number" &&
    typeof r.timestamp === "string"
  );
}

export function readHistory(): SpeedtestResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isResult) : [];
  } catch {
    // Private mode, disabled storage, or corrupted contents. History is a
    // convenience; losing it must never take the page down.
    return [];
  }
}

export function appendHistory(result: SpeedtestResult): SpeedtestResult[] {
  const next = [result, ...readHistory()].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* over quota or storage disabled; the in-memory list is still correct */
  }
  return next;
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
