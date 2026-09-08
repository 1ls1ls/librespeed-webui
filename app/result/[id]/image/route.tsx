import { getAppConfig } from "@/lib/server/config";
import { loadSharedResult } from "@/lib/server/results";
import { renderShareCard } from "@/lib/server/share-card";

/**
 * The share image at a stable, guessable URL.
 *
 * Next's own opengraph-image route already produces this card for link
 * previews, but its URL is an implementation detail with a content hash in it.
 * This is the address a person can copy, paste into a chat, or save.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadSharedResult(id);

  if (!result) return new Response("No such result", { status: 404 });

  return renderShareCard(result, getAppConfig().brandName);
}
