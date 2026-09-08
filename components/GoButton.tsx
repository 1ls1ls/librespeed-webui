"use client";

import { RestartIcon } from "./Icons";
import styles from "./GoButton.module.css";

export type GoButtonMode = "go" | "starting" | "again";

export interface GoButtonProps {
  mode: GoButtonMode;
  onClick: () => void;
}

/**
 * The dial's centre control.
 *
 * It stays mounted through the whole run and only changes appearance, because
 * it shares a grid cell with the live readout and the two cross-fade. Swapping
 * it out would empty the middle of the dial for a frame.
 */
export function GoButton({ mode, onClick }: GoButtonProps) {
  const label = mode === "again" ? "Run the test again" : "Start the speed test";

  return (
    <button
      type="button"
      className={styles.button}
      data-gauge-button=""
      data-mode={mode}
      onClick={onClick}
      disabled={mode === "starting"}
      aria-label={label}
      title={label}
    >
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.face}>
        {mode === "again" ? (
          <RestartIcon className={styles.icon} />
        ) : mode === "starting" ? (
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          "GO"
        )}
      </span>
    </button>
  );
}
