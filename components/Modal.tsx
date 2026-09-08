"use client";

import { useEffect, useRef } from "react";

import { CloseIcon } from "./Icons";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A dialog built on the native <dialog> element.
 *
 * showModal() brings focus trapping, the inert background, Escape-to-close and
 * the top layer with it — all things a hand-rolled overlay gets wrong, and all
 * of them accessibility behaviour rather than decoration.
 */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Fires for Escape as well as close(), so the parent's state cannot drift
    // out of step with whether the dialog is actually showing.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  /*
   * A click on the dialog element itself, rather than on its content, is a
   * click on the backdrop: the backdrop is painted by the dialog's own
   * ::backdrop pseudo-element and does not receive events of its own.
   */
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) ref.current?.close();
  };

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleClick} aria-label={title}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
