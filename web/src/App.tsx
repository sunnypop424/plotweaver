import { Outlet } from "react-router-dom";
import DevNav from "@/components/DevNav";
import { ViewportProvider } from "@/providers/ViewportProvider";
import { ToastProvider } from "@/providers/ToastProvider";

/**
 * 루트 레이아웃 — 전역 Provider(뷰포트·토스트) + 라우트 아웃렛 + 개발용 스위처(DevNav).
 * 도메인 셸(WizardLayout 등)은 중첩 라우트의 부모로 주입한다.
 */
export default function App() {
  return (
    <ViewportProvider>
      <ToastProvider>
        <Outlet />
        {import.meta.env.DEV && <DevNav />}
      </ToastProvider>
    </ViewportProvider>
  );
}
