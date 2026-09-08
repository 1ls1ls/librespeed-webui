import "server-only";

/**
 * LibreSpeed's convention: a request carrying `cors=true` is a cross-origin
 * measurement against this server acting as one node of a multi-server pool, so
 * it opts itself into permissive CORS. Same-origin requests get no such headers.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const hasCors = new URL(request.url).searchParams.has("cors");
  if (!hasCors) return {};
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/** Every measurement endpoint must reach the network on every call. */
export function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
    Pragma: "no-cache",
  };
}
