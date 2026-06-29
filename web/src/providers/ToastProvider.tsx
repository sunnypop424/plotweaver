import { useCallback, useRef, useState, type ReactNode } from "react";
import { Toast, ToastContext } from "@/components/Toast";

/** 앱 전역 토스트 — 루트에서 1회 마운트. 화면은 useToast().showToast만 호출. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((m: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setMsg(m);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={msg} />
    </ToastContext.Provider>
  );
}
