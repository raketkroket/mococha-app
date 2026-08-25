import { useEffect, type ReactNode } from "react";
import { XIcon } from "./icons";

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (open) document.body.classList.add("no-scroll");
    else document.body.classList.remove("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="sback" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
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
