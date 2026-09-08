import { getAppConfig } from "@/lib/server/config";
import { loadSharedResult } from "@/lib/server/results";
import { renderShareCard, shareCardSize } from "@/lib/server/share-card";

/**
 * The same card, wired into Next's metadata system so that pasting a result
 * link anywhere that reads Open Graph tags unfurls into the result itself.
 */

export const runtime = "nodejs";
export const size = shareCardSize;
export const contentType = "image/png";
export const alt = "Speed test result";

export default async function OpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadSharedResult(id);

  if (!result) {
    // Metadata images cannot 404, so an unknown id falls back to a blank card
    // rather than an unhandled error in a link preview crawler.
    return new Response("No such result", { status: 404 });
  }

  return renderShareCard(result, getAppConfig().brandName);
}
