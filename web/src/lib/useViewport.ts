import { useEffect, useState } from "react";

/** 반응형 분기 (DESIGN.md §8 브레이크포인트: 768 / 1024). */
export function useViewport() {
  const [vw, setVw] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { vw, isMobile: vw < 768, isDesktop: vw >= 1024 };
}
