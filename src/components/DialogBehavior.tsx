import { useEffect } from "react";
/** Keyboard focus stays inside the active modal, including nested image editors. */
export default function DialogBehavior() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let previous: HTMLElement | null = null;
    const getDialog = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"],[role="alertdialog"]',
        ),
      )
        .filter((x) => x.getBoundingClientRect().width > 0)
        .at(-1) ?? null;
    const sync = () => {
      const dialog = getDialog();
      if (dialog !== active) {
        if (dialog) {
          previous = document.activeElement as HTMLElement;
          if (!dialog.contains(document.activeElement)) {
            dialog.tabIndex = -1;
            dialog.focus();
          }
        } else if (previous?.isConnected) previous.focus();
        active = dialog;
        document.body.style.overflow = dialog ? "hidden" : "";
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    const key = (e: KeyboardEvent) => {
      const dialog = getDialog();
      if (!dialog) return;
      if (e.key === "Escape") {
        const close = dialog.querySelector<HTMLButtonElement>(
          '[data-dialog-close],button[aria-label^="إغلاق"]',
        );
        close?.click();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((x) => x.getBoundingClientRect().width > 0);
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0],
        last = focusable.at(-1)!;
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, []);
  return null;
}
