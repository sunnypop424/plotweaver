import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense, type ReactElement } from "react";
import App from "@/App";
import WizardLayout from "@/layouts/WizardLayout";

/* 화면은 라우트별 lazy import로 코드 분할 (도메인별 pages/ 하위) */
const LLanding = lazy(() => import("@/pages/landing/LLanding"));
const ALogin = lazy(() => import("@/pages/auth/ALogin"));
const ASignup = lazy(() => import("@/pages/auth/ASignup"));
const AFindAccount = lazy(() => import("@/pages/auth/AFindAccount"));
const ATerms = lazy(() => import("@/pages/auth/ATerms"));
const AContact = lazy(() => import("@/pages/auth/AContact"));
const ONBOnboarding = lazy(() => import("@/pages/onboarding/ONBOnboarding"));
const C0WorldWizard = lazy(() => import("@/pages/create/C0WorldWizard"));
const C1SettingsWizard = lazy(() => import("@/pages/create/C1SettingsWizard"));
const CNarrativeWizard = lazy(() => import("@/pages/create/CNarrativeWizard"));
const C2RelationshipBuilder = lazy(() => import("@/pages/create/C2RelationshipBuilder"));
const COutputWizard = lazy(() => import("@/pages/create/COutputWizard"));
const C3GeneratingLoader = lazy(() => import("@/pages/create/C3GeneratingLoader"));
const C4EditorViewer = lazy(() => import("@/pages/create/C4EditorViewer"));
const C5CoverGenerator = lazy(() => import("@/pages/create/C5CoverGenerator"));
const DLibrary = lazy(() => import("@/pages/library/DLibrary"));
const DWorkDetail = lazy(() => import("@/pages/library/DWorkDetail"));
const MMarketHome = lazy(() => import("@/pages/market/MMarketHome"));
const MSalesPage = lazy(() => import("@/pages/market/MSalesPage"));
const MReader = lazy(() => import("@/pages/market/MReader"));
const TTipModal = lazy(() => import("@/pages/market/TTipModal"));
const PPayment = lazy(() => import("@/pages/account/PPayment"));
const PMyPage = lazy(() => import("@/pages/account/PMyPage"));
const SDashboard = lazy(() => import("@/pages/seller/SDashboard"));
const SRegister = lazy(() => import("@/pages/seller/SRegister"));
const RReport = lazy(() => import("@/pages/ops/RReport"));
const OAdminConsole = lazy(() => import("@/pages/ops/OAdminConsole"));

/** 코드 분할 로딩 폴백 — 기존 캔버스 톤 유지(과한 연출 없이). */
function Page({ children }: { children: ReactElement }) {
  return <Suspense fallback={<div className="min-h-screen bg-canvas" />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <Page><LLanding /></Page> },
      { path: "login", element: <Page><ALogin /></Page> },
      { path: "auth", element: <Page><ALogin /></Page> },
      { path: "signup", element: <Page><ASignup /></Page> },
      { path: "find-id", element: <Page><AFindAccount initial="id" /></Page> },
      { path: "find-password", element: <Page><AFindAccount initial="pw" /></Page> },
      { path: "terms", element: <Page><ATerms initial="terms" /></Page> },
      { path: "privacy", element: <Page><ATerms initial="privacy" /></Page> },
      { path: "contact", element: <Page><AContact /></Page> },
      { path: "onboarding", element: <Page><ONBOnboarding /></Page> },

      /* 창작 위저드 5스텝 — WizardLayout(상단바+스텝퍼) 공유, current는 handle.step */
      {
        element: <WizardLayout />,
        children: [
          { path: "create/world", handle: { step: 1 }, element: <Page><C0WorldWizard /></Page> },
          { path: "create", handle: { step: 2 }, element: <Page><C1SettingsWizard /></Page> },
          { path: "create/narrative", handle: { step: 3 }, element: <Page><CNarrativeWizard /></Page> },
          { path: "create/relations", handle: { step: 4 }, element: <Page><C2RelationshipBuilder /></Page> },
          { path: "create/output", handle: { step: 5 }, element: <Page><COutputWizard /></Page> },
        ],
      },
      /* 생성 로딩 — 풀스크린(위저드 chrome 없음) */
      { path: "create/generating", element: <Page><C3GeneratingLoader /></Page> },

      /* 작품 */
      { path: "works/:id/edit", element: <Page><C4EditorViewer /></Page> },
      { path: "works/:id/cover", element: <Page><C5CoverGenerator /></Page> },
      { path: "works/:id", element: <Page><DWorkDetail /></Page> },
      { path: "library", element: <Page><DLibrary /></Page> },

      /* 마켓 */
      { path: "market", element: <Page><MMarketHome /></Page> },
      { path: "market/:id", element: <Page><MSalesPage /></Page> },
      { path: "read/:id", element: <Page><MReader /></Page> },

      /* 결제 / 계정 */
      { path: "billing", element: <Page><PPayment /></Page> },
      { path: "me", element: <Page><PMyPage /></Page> },
      { path: "tip", element: <Page><TTipModal /></Page> },

      /* 판매자 / 운영 */
      { path: "seller", element: <Page><SDashboard /></Page> },
      { path: "seller/register", element: <Page><SRegister /></Page> },
      { path: "report", element: <Page><RReport /></Page> },
      { path: "admin", element: <Page><OAdminConsole /></Page> },
    ],
  },
]);
