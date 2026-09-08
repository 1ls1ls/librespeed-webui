import { getClientIp } from "@/lib/server/client-ip";
import { corsHeaders, noStoreHeaders } from "@/lib/server/http";
import { describeIp } from "@/lib/server/isp";

/**
 * Reports who the caller appears to be, in the shape LibreSpeed's worker reads:
 * `{ processedString, rawIspInfo }`. The worker shows processedString verbatim
 * and files rawIspInfo alongside the result in telemetry.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ip = getClientIp(request.headers);
  const payload = await describeIp(ip, url.searchParams.has("isp"));

  return Response.json(payload, {
    headers: { ...noStoreHeaders(), ...corsHeaders(request) },
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
