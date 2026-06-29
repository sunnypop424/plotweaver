import { useEffect, useState, type ReactNode } from "react";
import { ViewportContext } from "@/lib/useViewport";

/** 앱 전역에서 단일 resize 리스너로 뷰포트를 공급한다. */
export function ViewportProvider({ children }: { children: ReactNode }) {
  const [vw, setVw] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <ViewportContext.Provider value={{ vw, isMobile: vw < 768, isDesktop: vw >= 1024 }}>
      {children}
    </ViewportContext.Provider>
  );
}
