import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAppConfig } from "@/lib/server/config";

import styles from "./not-found.module.css";

export const dynamic = "force-dynamic";

/**
 * Reached most often by a share link whose id no longer resolves — a mistyped
 * URL, or a result from a database that has since been cleared. The wording
 * says that rather than "404", because the id is the thing that failed.
 */
export default function NotFound() {
  const config = getAppConfig();

  return (
    <div className={styles.page}>
      <SiteHeader brandName={config.brandName} />
      <main className={styles.main}>
        <h1 className={styles.title}>No such result</h1>
        <p className={styles.blurb}>
          That link does not point at a stored result. It may have been mistyped, or the
          result may have been removed from this server.
        </p>
        <Link href="/" className={styles.cta}>
          Run a speed test
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
