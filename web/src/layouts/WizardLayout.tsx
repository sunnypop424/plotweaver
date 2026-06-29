import { Outlet, useMatches, useNavigate } from "react-router-dom";
import { WizardChrome } from "@/components/WizardChrome";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

/** 창작 위저드 5스텝 공통 셸 — 상단바 + 5스텝 인디케이터. current는 라우트 handle로 주입. */
const PREV: Record<number, string> = {
  1: "/library",
  2: "/create/world",
  3: "/create",
  4: "/create/narrative",
  5: "/create/relations",
};

export default function WizardLayout() {
  const { isMobile } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const matches = useMatches();
  const handle = matches[matches.length - 1]?.handle as { step?: number } | undefined;
  const step = handle?.step ?? 1;

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome
        current={step}
        isMobile={isMobile}
        onBack={() => navigate(PREV[step] ?? "/library")}
        onSaveDraft={() => showToast("임시저장됨")}
      />
      <Outlet />
    </div>
  );
}
