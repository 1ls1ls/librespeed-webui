/*
 * One formatter, used by the live readout, the results list and the share
 * image alike. They must agree digit for digit: a share card that rounds
 * differently from the screen it was generated from reads as a bug.
 */

/**
 * Formats a throughput figure the way a speed test is expected to read:
 * precise while the number is small enough for the precision to mean
 * something, progressively coarser as it grows past the point where trailing
 * digits are noise.
 */
export function formatSpeed(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0.00";
  if (value < 100) return value.toFixed(2);
  if (value < 1000) return value.toFixed(1);
  return value.toFixed(0);
}

/** Latency figures stay at whole or single-decimal milliseconds. */
export function formatLatency(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value < 10) return value.toFixed(1);
  return value.toFixed(0);
}

/**
 * Splits a formatted number so the integer part can be typeset large and the
 * decimals small, which is what keeps a four-character reading and a
 * six-character reading looking like the same element.
 */
export function splitNumber(formatted: string): { whole: string; fraction: string } {
  const dot = formatted.indexOf(".");
  if (dot === -1) return { whole: formatted, fraction: "" };
  return { whole: formatted.slice(0, dot), fraction: formatted.slice(dot) };
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Pulls the ISP out of getIP's "1.2.3.4 - Example ISP, US (<20 km)" string.
 * Returns an empty string when the endpoint reported only an address, which is
 * the normal case on an intranet.
 */
export function ispFromProcessedString(processed: string | undefined): string {
  if (!processed) return "";
  const dash = processed.indexOf(" - ");
  if (dash === -1) return "";
  let isp = processed.slice(dash + 3);
  const paren = isp.lastIndexOf("(");
  if (paren !== -1) isp = isp.slice(0, paren);
  return isp.trim();
}

/** The address half of the same string. */
export function ipFromProcessedString(processed: string | undefined): string {
  if (!processed) return "";
  const dash = processed.indexOf(" - ");
  return (dash === -1 ? processed : processed.slice(0, dash)).trim();
}
