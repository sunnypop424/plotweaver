import { createContext, useContext } from "react";

/** 화면 하단 중앙 토스트 (DESIGN.md §toast). 상태는 ToastProvider가 보유, 호출은 useToast(). */
type ToastCtx = { showToast: (msg: string) => void };
export const ToastContext = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  return ctx ?? { showToast: () => {} }; // Provider 밖에서는 no-op 폴백
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
