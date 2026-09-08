import "server-only";

import { existsSync } from "node:fs";

import { assetPath } from "./paths";
import type { IpInfoResponse } from "@/lib/types";

/*
 * Describing the address a test came from.
 *
 * Resolution is entirely local: a MaxMind-format ASN database shipped inside
 * the project, never a call to a lookup API. That is a hard requirement rather
 * than a preference — the target deployment may have no route off the LAN at
 * all, and an outbound lookup there would not merely fail, it would stall the
 * request that the measurement is waiting on.
 */

const DB_PATH = () => process.env.SPEEDTEST_GEOIP_DB || assetPath("assets", "geoip", "country_asn.mmdb");

interface AsnRecord extends Record<string, unknown> {
  as_name?: string;
  as_domain?: string;
  asn?: string;
  country?: string;
  country_name?: string;
  continent_name?: string;
}

/*
 * The shipped database is ipinfo's ASN extract, whose record shape is not one
 * of the GeoIP2 layouts the maxmind package's generic parameter is constrained
 * to — its `country` is a plain string where GeoIP2 has an object. Only `get`
 * is ever called, so the reader is narrowed to that here rather than fighting a
 * type that describes a different file format.
 */
interface AsnLookup {
  get(ip: string): AsnRecord | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __geoipReader: Promise<AsnLookup | null> | undefined;
}

function reader(): Promise<AsnLookup | null> {
  if (!globalThis.__geoipReader) {
    globalThis.__geoipReader = (async () => {
      const file = DB_PATH();
      if (!existsSync(file)) {
        console.warn(`[isp] no GeoIP database at ${file}; results will show addresses only`);
        return null;
      }
      try {
        const maxmind = await import("maxmind");
        const opened = await maxmind.open(file);
        return opened as unknown as AsnLookup;
      } catch (err) {
        console.warn("[isp] GeoIP database could not be opened:", err);
        return null;
      }
    })();
  }
  return globalThis.__geoipReader;
}

/**
 * Names the kind of network a non-routable address belongs to.
 *
 * On an intranet this is the answer almost every time, and it is a more useful
 * one than a failed ISP lookup: it tells the user the test stayed on the local
 * network. The wording matches LibreSpeed's so that stored results read the
 * same across both implementations.
 */
export function describeLocalAddress(ip: string): string | null {
  if (ip === "::1") return "localhost IPv6 access";
  if (/^fe80:/i.test(ip)) return "link-local IPv6 access";
  if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(ip)) return "ULA IPv6 access";
  if (ip.startsWith("127.")) return "localhost IPv4 access";
  if (ip.startsWith("10.")) return "private IPv4 access";
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return "private IPv4 access";
  if (ip.startsWith("192.168.")) return "private IPv4 access";
  if (ip.startsWith("169.254.")) return "link-local IPv4 access";
  return null;
}

/**
 * Builds the payload the LibreSpeed worker expects from the IP endpoint:
 * a display string, plus whatever structured data backed it for telemetry.
 */
export async function describeIp(ip: string, withIsp: boolean): Promise<IpInfoResponse> {
  if (!ip) return { processedString: "", rawIspInfo: "" };
  if (!withIsp) return { processedString: ip, rawIspInfo: "" };

  const local = describeLocalAddress(ip);
  if (local) return { processedString: `${ip} - ${local}`, rawIspInfo: "" };

  try {
    const db = await reader();
    const record = db?.get(ip);
    if (record?.as_name) {
      const parts = [record.as_name, record.country_name].filter(Boolean);
      return { processedString: `${ip} - ${parts.join(", ")}`, rawIspInfo: record };
    }
  } catch (err) {
    console.warn("[isp] lookup failed:", err);
  }

  return { processedString: ip, rawIspInfo: "" };
}
