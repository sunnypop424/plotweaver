import { Outlet, useMatches, useNavigate } from "react-router-dom";
import { WizardChrome } from "@/components/WizardChrome";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";

const STEP_PATHS = [
  "/create/world",
  "/create",
  "/create/relations",
  "/create/narrative",
  "/create/output",
];

const PREV: Record<number, string> = {
  1: "/library",
  2: "/create/world",
  3: "/create",
  4: "/create/relations",
  5: "/create/narrative",
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
    if (isEditMode) {
      // 편집 모드에서 뒤로가기는 항상 진입 이전 페이지로 (에디터 or 작품 상세)
      // 스텝 간 이동은 헤더 스텝 클릭으로 대체
      navigate(wizData.returnTo ?? `/works/${wizData.editingNovelId}`);
    } else {
      navigate(PREV[step] ?? "/library");
    }
  };

  const handleStepClick = (clickedStep: number) => {
    // 편집 모드: 모든 스텝 이동 가능 / 생성 모드: 현재 이하만
    if (!isEditMode && clickedStep > step) return;
    navigate(STEP_PATHS[clickedStep - 1]);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome
        current={step}
        isMobile={isMobile}
        isEditMode={isEditMode}
        maxClickableStep={isEditMode ? 5 : step}
        onBack={handleBack}
        onStepClick={handleStepClick}
        onSaveDraft={() => showToast("임시저장됨")}
      />
      <Outlet />
    </div>
  );
}
