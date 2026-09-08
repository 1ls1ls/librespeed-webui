import { corsHeaders, noStoreHeaders } from "@/lib/server/http";

/*
 * The ping target and the upload sink, in one endpoint — exactly as LibreSpeed
 * uses empty.php for both.
 *
 * GET is the latency probe. Its response body must be empty: the server
 * selector in speedtest.js treats any content at all as a failed probe and
 * drops the server from the list.
 *
 * POST is the upload test. The client streams tens of megabytes at it and
 * cares only about how fast the socket accepts them. The body still has to be
 * read — abandoning it unread makes the runtime tear the connection down
 * mid-transfer, which the client scores as a failed stream.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function emptyResponse(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      ...noStoreHeaders(),
      ...corsHeaders(request),
      "Content-Length": "0",
      Connection: "keep-alive",
    },
  });
}

export async function GET(request: Request) {
  return emptyResponse(request);
}

export async function POST(request: Request) {
  const body = request.body;
  if (body) {
    /*
     * Drained chunk by chunk and discarded. Calling arrayBuffer() here would be
     * far shorter and would also hold every uploaded megabyte in memory at
     * once, per concurrent stream, for no reason — nothing ever looks at these
     * bytes.
     */
    const reader = body.getReader();
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      // A stream cut short by the client is ordinary: the test aborts streams
      // as soon as its timer expires. Nothing to report.
    } finally {
      reader.releaseLock();
    }
  }
  return emptyResponse(request);
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      // The worker sets Content-Encoding on upload requests, which makes the
      // browser preflight them in multi-server mode.
      "Access-Control-Allow-Headers": "Content-Encoding, Content-Type",
    },
  });
}
