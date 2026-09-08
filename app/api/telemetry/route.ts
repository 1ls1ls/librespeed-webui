import { getClientIp } from "@/lib/server/client-ip";
import { redactIpAddresses } from "@/lib/server/config";
import { getStore } from "@/lib/server/db";
import { corsHeaders, noStoreHeaders } from "@/lib/server/http";
import { encodeId } from "@/lib/server/obfuscation";

/*
 * Telemetry intake.
 *
 * The worker POSTs a finished run here and reads back the literal string
 * "id <share-id>"; that response format is part of LibreSpeed's contract, not a
 * choice this app gets to make, and the share id it returns is what every
 * result link and share image is addressed by afterwards.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Worker logs are unbounded in principle; stored ones are not. */
const MAX_LOG_BYTES = 64 * 1024;
const MAX_FIELD_BYTES = 8 * 1024;

const IPV4 = /(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)/g;
const IPV6 =
  /(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}(?:%[0-9a-zA-Z]+)?|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}/g;
const HOSTNAME = /"hostname"\s*:\s*"(?:[^"\\]|\\.)*"/g;

function truncate(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}

function field(form: FormData, name: string, limit = MAX_FIELD_BYTES): string {
  const raw = form.get(name);
  return typeof raw === "string" ? truncate(raw, limit) : "";
}

/**
 * Keeps a measurement figure only if it looks like one. The values arrive as
 * strings from the worker and are stored as strings, so without this an
 * arbitrary body could be written into the results table and then rendered back
 * out on a result page.
 */
function measurement(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "Fail") return "Fail";
  return /^\d{1,10}(\.\d{1,4})?$/.test(trimmed) ? trimmed : "0";
}

/** Scrubs addresses and hostnames when the deployment asks not to keep them. */
function redact(value: string): string {
  return value
    .replace(IPV4, "0.0.0.0")
    .replace(IPV6, "0.0.0.0")
    .replace(HOSTNAME, '"hostname":"REDACTED"');
}

export async function POST(request: Request) {
  const headers = { ...noStoreHeaders(), ...corsHeaders(request), "Content-Type": "text/plain" };

  let form: FormData;
  try {
    // Covers both transports the worker uses: multipart FormData normally, and
    // urlencoded on the older browsers where FormData construction throws.
    form = await request.formData();
  } catch {
    return new Response("error malformed request", { status: 400, headers });
  }

  const redacting = redactIpAddresses();
  let ip = getClientIp(request.headers);
  let ispinfo = field(form, "ispinfo");
  let log = field(form, "log", MAX_LOG_BYTES);

  if (redacting) {
    ip = "0.0.0.0";
    ispinfo = redact(ispinfo);
    log = redact(log);
  }

  try {
    const rowId = await getStore().insert({
      ip,
      ispinfo,
      extra: field(form, "extra"),
      ua: truncate(request.headers.get("user-agent") ?? "", 1024),
      lang: truncate(request.headers.get("accept-language") ?? "", 256),
      dl: measurement(field(form, "dl")),
      ul: measurement(field(form, "ul")),
      ping: measurement(field(form, "ping")),
      jitter: measurement(field(form, "jitter")),
      log,
    });

    return new Response(`id ${encodeId(rowId)}`, { status: 200, headers });
  } catch (err) {
    console.error("[telemetry] could not store result:", err);
    // The worker treats any non-"id ..." response as "no share link available"
    // and the test itself still completes, so this degrades rather than breaks.
    return new Response("error could not store result", { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(request), "Access-Control-Allow-Headers": "Content-Type" },
  });
}
