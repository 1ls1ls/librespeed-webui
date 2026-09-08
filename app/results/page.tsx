import type { Metadata } from "next";

import { HistoryList } from "@/components/HistoryList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAppConfig } from "@/lib/server/config";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Your results" };

export const dynamic = "force-dynamic";

export default function ResultsPage() {
  const config = getAppConfig();

  return (
    <div className={styles.page}>
      <SiteHeader brandName={config.brandName} current="results" />
      <main className={`shell ${styles.main}`}>
        <h1 className={styles.title}>Your results</h1>
        <p className={styles.blurb}>
          Tests run in this browser. They are stored on this device only — nothing here
          identifies you to the server, and clearing them affects only this browser.
        </p>
        <HistoryList />
      </main>
      <SiteFooter />
    </div>
  );
}
