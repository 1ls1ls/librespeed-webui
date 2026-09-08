import styles from "./SiteFooter.module.css";

/**
 * Attribution.
 *
 * The measurement core is LibreSpeed, used under the LGPL, and the typeface is
 * Barlow under the Open Font License. Naming both is a licence obligation as
 * much as a courtesy, and it also tells anyone reading a shared result what
 * actually produced the numbers.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.inner}`}>
        <p className={styles.line}>
          Measurement engine by{" "}
          <a
            className={styles.link}
            href="https://github.com/librespeed/speedtest"
            rel="noreferrer noopener"
            target="_blank"
          >
            LibreSpeed
          </a>
          , used under the LGPL. Typeset in Barlow (SIL Open Font License).
        </p>
        <p className={styles.line}>
          Everything on this page is served from this host — no external
          requests, no trackers.
        </p>
      </div>
    </footer>
  );
}
