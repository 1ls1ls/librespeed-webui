import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SpeedTest } from "@/components/SpeedTest";
import { basePath, getAppConfig } from "@/lib/server/config";

import styles from "./page.module.css";

/*
 * Configuration is resolved here, on the server, and handed to the client
 * component as props. That is what lets an operator retune a running instance
 * through environment variables instead of rebuilding the bundle.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  const config = getAppConfig();

  return (
    <div className={styles.page}>
      <SiteHeader brandName={config.brandName} current="test" />
      <main className={styles.main}>
        <SpeedTest config={config} basePath={basePath()} />
      </main>
      <SiteFooter />
    </div>
  );
}
