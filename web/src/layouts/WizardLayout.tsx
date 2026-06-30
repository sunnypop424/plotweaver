import { Outlet, useMatches, useNavigate } from "react-router-dom";
import { WizardChrome } from "@/components/WizardChrome";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";

/** 창작 위저드 5스텝 공통 셸 — 상단바 + 5스텝 인디케이터. current는 라우트 handle로 주입. */
const PREV: Record<number, string> = {
  1: "/library",
  2: "/create/world",
  3: "/create",           // 관계도(3) 이전 = 인물(2)
  4: "/create/relations", // 서사(4) 이전 = 관계도(3)
  5: "/create/narrative", // 출력(5) 이전 = 서사(4)
};

export default function WizardLayout() {
  const { isMobile } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const matches = useMatches();
  const handle = matches[matches.length - 1]?.handle as { step?: number } | undefined;
  const step = handle?.step ?? 1;
  const { data: wizData } = useWizard();
  const isEditMode = !!wizData.editingNovelId;

  const handleBack = () => {
    if (isEditMode && step === 1) {
      navigate(`/works/${wizData.editingNovelId}`);
    } else {
      navigate(PREV[step] ?? "/library");
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome
        current={step}
        isMobile={isMobile}
        isEditMode={isEditMode}
        onBack={handleBack}
        onSaveDraft={() => showToast("임시저장됨")}
      />
      <Outlet />
    </div>
  );
}
