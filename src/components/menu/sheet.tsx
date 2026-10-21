"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Bottom sheet on phones, centred dialog from 640px. Built on <dialog>, so
 * focus is trapped, Esc closes it and focus returns to the opener. Styles and
 * open/close transitions live in src/app/menu/menu.css (.sheet).
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Whether the parent still wants this sheet open. A "close" event while it
  // does means the user dismissed it (Esc); a close we caused is ignored, so
  // switching from one sheet to another doesn't reset the parent's state.
  const wantedOpen = useRef(open);

  useEffect(() => {
    wantedOpen.current = open;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={labelledBy}
      onClose={() => wantedOpen.current && onClose()}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </dialog>
  );
}
