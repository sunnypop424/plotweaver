import { useCallback, useEffect, useRef, useState } from "react";

/** 화면 하단 중앙 토스트 (DESIGN.md §toast) + 호출 훅. */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast(msg);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toast, showToast };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="fixed left-1/2 bottom-24 z-50 -translate-x-1/2 rounded bg-toast
        px-[18px] py-3.5 text-sm text-white shadow-toast whitespace-nowrap
        animate-toast-in"
    >
      {message}
    </div>
  );
}
