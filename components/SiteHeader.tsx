import Link from "next/link";

import { HistoryIcon } from "./Icons";
import styles from "./SiteHeader.module.css";

export interface SiteHeaderProps {
  brandName: string;
  /** Highlights whichever view is showing. */
  current?: "test" | "results";
}

/**
 * The brand mark. Drawn here rather than loaded as a file so it inherits the
 * page's gradient tokens and stays crisp at any size.
 */
function BrandMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brandMark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6afff3" />
          <stop offset="0.5" stopColor="#1cbfff" />
          <stop offset="1" stopColor="#bf71ff" />
        </linearGradient>
      </defs>
      <path
        d="M14 44a20 20 0 1 1 36 0"
        fill="none"
        stroke="url(#brandMark)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M32 34 43 23" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="35" r="4.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The masthead.
 *
 * Intentionally thin: a brand, and a way back to your own results. There is no
 * app-download rail, no promoted links and no advertising slot, because none of
 * that helps anyone measure a connection.
 */
export function SiteHeader({ brandName, current = "test" }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`shell ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <BrandMark />
          <span className={styles.wordmark}>{brandName}</span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <Link href="/" className={styles.link} data-current={current === "test" || undefined}>
            Test
          </Link>
          <Link
            href="/results"
            className={styles.link}
            data-current={current === "results" || undefined}
          >
            <HistoryIcon className={styles.linkIcon} />
            Results
          </Link>
        </nav>
      </div>
    </header>
  );
}
