"use client";

import type { TestServer } from "@/lib/types";

import { CheckIcon, ServerIcon } from "./Icons";
import { Modal } from "./Modal";
import styles from "./ServerPicker.module.css";

export interface ServerPickerProps {
  open: boolean;
  servers: TestServer[];
  selected: TestServer | null;
  selecting: boolean;
  onSelect: (server: TestServer) => void;
  onRefresh: () => void;
  onClose: () => void;
}

/** Renders a probed round-trip time, or says why there is not one. */
function pingLabel(server: TestServer, selecting: boolean): string {
  if (typeof server.pingT !== "number") return selecting ? "Testing…" : "—";
  return server.pingT < 0 ? "Unreachable" : `${Math.round(server.pingT)} ms`;
}

export function ServerPicker({
  open,
  servers,
  selected,
  selecting,
  onSelect,
  onRefresh,
  onClose,
}: ServerPickerProps) {
  return (
    <Modal open={open} title="Choose a server" onClose={onClose}>
      <ul className={styles.list}>
        {servers.map((server) => {
          const isSelected = selected?.server === server.server;
          const unreachable = server.pingT === -1;

          return (
            <li key={`${server.name}-${server.server}`}>
              <button
                type="button"
                className={styles.item}
                data-selected={isSelected || undefined}
                // An unreachable server cannot produce a measurement, so it is
                // shown for diagnosis but not offered as a choice.
                disabled={unreachable}
                onClick={() => {
                  onSelect(server);
                  onClose();
                }}
              >
                <span className={styles.icon} aria-hidden="true">
                  <ServerIcon />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{server.name}</span>
                  <span className={styles.host}>{server.server}</span>
                </span>
                <span className={styles.ping} data-unreachable={unreachable || undefined}>
                  {pingLabel(server, selecting)}
                </span>
                {isSelected ? (
                  <span className={styles.check} aria-label="Selected">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" className={styles.refresh} onClick={onRefresh} disabled={selecting}>
        {selecting ? "Measuring…" : "Measure again"}
      </button>
    </Modal>
  );
}
