import { randomBytes } from "node:crypto";

import { corsHeaders, noStoreHeaders } from "@/lib/server/http";

/*
 * The download source.
 *
 * This is the hottest path in the app: for fifteen seconds, six concurrent
 * streams pull from it as fast as the link allows, and anything this handler
 * does per byte lands directly in the number the user sees. So it does as close
 * to nothing as possible — one buffer of random bytes, allocated once for the
 * lifetime of the process, handed to the socket over and over.
 *
 * The payload must be incompressible, or a proxy or browser that negotiates
 * gzip would measure the compressor rather than the link. Random bytes
 * guarantee that regardless of what sits in front of this server.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MIB = 1048576;

/** Default chunk count, matching LibreSpeed's garbage.php. */
const DEFAULT_CHUNKS = 4;
/** Upper bound, so one request cannot be asked for an unbounded transfer. */
const MAX_CHUNKS = 1024;

/*
 * Generated once per process rather than per request. Re-randomising per
 * request would put a CSPRNG on the critical path for every megabyte; the
 * bytes only need to be incompressible, not unpredictable, and repeating a
 * 1 MiB block does not make it compressible to any transport-level compressor
 * operating on a smaller window. The block is intentionally not module-level
 * `const` at import time in dev-reload terms — it is cheap enough either way.
 */
let block: Buffer | null = null;
function garbageBlock(): Buffer {
  if (!block) block = randomBytes(MIB);
  return block;
}

function chunkCount(request: Request): number {
  const raw = new URL(request.url).searchParams.get("ckSize");
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_CHUNKS;
  const parsed = Number(raw);
  if (parsed <= 0) return DEFAULT_CHUNKS;
  return Math.min(parsed, MAX_CHUNKS);
}

export async function GET(request: Request) {
  const chunks = chunkCount(request);
  const data = garbageBlock();

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    /*
     * Enqueue on demand instead of pushing the whole response up front, so the
     * stream fills at the rate the socket drains. Without this the server would
     * buffer the entire transfer in memory and the client's progress events
     * would describe the buffer rather than the network.
     */
    pull(controller) {
      if (sent >= chunks) {
        controller.close();
        return;
      }
      controller.enqueue(data);
      sent++;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...noStoreHeaders(),
      ...corsHeaders(request),
      "Content-Type": "application/octet-stream",
      "Content-Length": String(chunks * MIB),
      "Content-Disposition": "attachment; filename=random.dat",
      "Content-Encoding": "identity",
      // Belt and braces against an intermediary that buffers by default.
      "X-Accel-Buffering": "no",
    },
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
