import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.classList.add("no-scroll");
    else document.body.classList.remove("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    sheetRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sback" onClick={onClose} />
      <div ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="shandle" />
        {title && (
          <div className="rb mb16">
            <h2 className="screen-title" style={{ fontSize: "1.05rem" }}>{title}</h2>
            <button className="hbtn" onClick={onClose} aria-label="Sluiten"><XIcon size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
