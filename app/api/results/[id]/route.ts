import { noStoreHeaders } from "@/lib/server/http";
import { loadSharedResult } from "@/lib/server/results";

/**
 * A stored result, by share id, as JSON. This is the machine-readable half of
 * result sharing; /result/<id> is the human-readable one.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadSharedResult(id);

  if (!result) {
    return Response.json({ error: "not found" }, { status: 404, headers: noStoreHeaders() });
  }
  return Response.json(result, { headers: noStoreHeaders() });
}
