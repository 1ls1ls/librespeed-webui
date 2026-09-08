import "server-only";

import { isIP } from "node:net";

import { trustProxy } from "./config";

/**
 * Header the bundled server stamps with the TCP peer address. It is deleted
 * from every inbound request before being set, so unlike X-Forwarded-For it
 * cannot be supplied by the client.
 */
export const PEER_HEADER = "x-speedtest-peer";

/** Headers an upstream proxy may set, most specific first. */
const PROXY_HEADERS = ["cf-connecting-ipv6", "x-real-ip", "x-client-ip", "x-forwarded-for"];

/**
 * Normalises one header value: takes the first entry of an X-Forwarded-For
 * chain, drops the IPv4-mapped IPv6 prefix, and rejects anything that is not an
 * address. Returning null rather than the raw string keeps unvalidated header
 * content out of the database.
 */
function normalise(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]!.trim();
  if (!first) return null;

  // A bracketed literal with a port, "[::1]:443", and a bare "1.2.3.4:443".
  const unwrapped = first.startsWith("[")
    ? first.slice(1, first.indexOf("]") === -1 ? undefined : first.indexOf("]"))
    : first;
  const candidate = unwrapped.replace(/^::ffff:/i, "");

  if (isIP(candidate)) return candidate;

  const withoutPort = candidate.replace(/:\d+$/, "");
  return isIP(withoutPort) ? withoutPort : null;
}

/**
 * Resolves the address a request came from.
 *
 * Proxy headers are believed only when TRUST_PROXY says an upstream is
 * actually terminating connections. Believing them unconditionally, as the
 * original PHP backend does, lets any client dictate the address recorded
 * against its own result simply by sending an X-Forwarded-For of its choosing.
 *
 * Returns an empty string when nothing trustworthy is available, which the
 * caller renders as an unknown client rather than inventing an address.
 */
export function getClientIp(headers: Headers): string {
  if (trustProxy()) {
    for (const header of PROXY_HEADERS) {
      const ip = normalise(headers.get(header));
      if (ip) return ip;
    }
  }
  return normalise(headers.get(PEER_HEADER)) ?? "";
}
