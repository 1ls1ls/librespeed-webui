import "server-only";

import { ipFromProcessedString, ispFromProcessedString } from "@/lib/format";
import { getStore } from "./db";
import { decodeId } from "./obfuscation";

/**
 * A stored measurement, reduced to what a shared result actually shows. The
 * result page, the JSON API and the share image all render from this one shape,
 * so a link, an unfurl card and an API consumer can never disagree about what a
 * given result says.
 */
export interface SharedResult {
  id: string;
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  /** Empty when the run was local or the ISP could not be resolved. */
  isp: string;
  /** Empty unless the deployment runs more than one measurement server. */
  server: string;
  /** "IPv4" | "IPv6" | "" — the family only, never the address itself. */
  addressFamily: string;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Pulls the display string out of the JSON blob getIP produced. */
function processedString(ispinfo: string): string {
  if (!ispinfo) return "";
  try {
    const parsed = JSON.parse(ispinfo) as { processedString?: unknown };
    return typeof parsed.processedString === "string" ? parsed.processedString : "";
  } catch {
    return "";
  }
}

/**
 * The server name, from the `extra` column.
 *
 * speedtest.js writes two different shapes into it: a bare `{server}` in
 * single-server mode, and `{server, extra}` once a server has been selected
 * from a pool. Both are read here so the field means the same thing either way.
 */
function serverName(extra: string): string {
  if (!extra) return "";
  try {
    const parsed = JSON.parse(extra) as { server?: unknown };
    return typeof parsed.server === "string" ? parsed.server : "";
  } catch {
    return "";
  }
}

/**
 * Reports which protocol carried the test without disclosing the address.
 * A redacted deployment stores a placeholder, which would otherwise be
 * announced as IPv4 — so that case reports nothing at all.
 */
function addressFamily(ip: string): string {
  if (!ip || ip === "0.0.0.0") return "";
  if (ip.includes(":")) return "IPv6";
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? "IPv4" : "";
}

/** Looks up a result by its public share id. Returns null for unknown ids. */
export async function loadSharedResult(shareId: string): Promise<SharedResult | null> {
  const rowId = decodeId(shareId);
  if (rowId === null) return null;

  const row = await getStore().getById(rowId);
  if (!row) return null;

  const processed = processedString(row.ispinfo);

  return {
    id: shareId,
    timestamp: row.timestamp,
    download: toNumber(row.dl),
    upload: toNumber(row.ul),
    ping: toNumber(row.ping),
    jitter: toNumber(row.jitter),
    isp: ispFromProcessedString(processed),
    server: serverName(row.extra),
    addressFamily: addressFamily(ipFromProcessedString(processed) || row.ip),
  };
}
