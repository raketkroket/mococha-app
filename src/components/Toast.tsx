import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckIcon } from "./icons";

type ToastContextValue = { showToast: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <ToastContext.Provider value={{ showToast: setMessage }}>
      {children}
      {message && (
        <div className="toast-region" role="status" aria-live="polite">
          <div className="toast"><CheckIcon size={18} />{message}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}