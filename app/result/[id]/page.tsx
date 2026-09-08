import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultView } from "@/components/ResultView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatSpeed } from "@/lib/format";
import { basePath, getAppConfig } from "@/lib/server/config";
import { loadSharedResult } from "@/lib/server/results";

import styles from "./page.module.css";

/*
 * A shared result lives at a stable URL and is rendered on the server. Results
 * are looked up per request rather than cached, because a share id points at a
 * specific stored row that either exists or does not — there is nothing to
 * revalidate, and a cached 404 would outlive the reason for it.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadSharedResult(id);

  if (!result) return { title: "Result not found" };

  return {
    title: `${formatSpeed(result.download)} Mbps down, ${formatSpeed(result.upload)} Mbps up`,
    description: `Speed test result ${result.id}${result.isp ? ` on ${result.isp}` : ""}.`,
  };
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadSharedResult(id);

  // Covers both an id that decodes to nothing and one that is not an id at all,
  // so a mistyped link reads as "no such result" rather than as an error.
  if (!result) notFound();

  const config = getAppConfig();

  return (
    <div className={styles.page}>
      <SiteHeader brandName={config.brandName} />
      <main className={styles.main}>
        <ResultView result={result} basePath={basePath()} />
      </main>
      <SiteFooter />
    </div>
  );
}
