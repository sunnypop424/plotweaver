import { createContext, useContext, useEffect, useState } from "react";

/** 반응형 분기 (DESIGN.md §8 브레이크포인트: 768 / 1024). */
export type Viewport = { vw: number; isMobile: boolean; isDesktop: boolean };
export const ViewportContext = createContext<Viewport | null>(null);

const compute = (vw: number): Viewport => ({ vw, isMobile: vw < 768, isDesktop: vw >= 1024 });

/**
 * Provider(ViewportProvider)가 있으면 단일 resize 리스너를 공유하고,
 * 없으면 자체 계산으로 폴백한다(개별 컴포넌트 단독 사용 호환).
 */
export function useViewport(): Viewport {
  const ctx = useContext(ViewportContext);
  const [vw, setVw] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    if (ctx) return; // provider가 리스너를 담당
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ctx]);
  return ctx ?? compute(vw);
}
