import { useState } from "react";
import C1SettingsWizard from "./screens/C1SettingsWizard";
import C2RelationshipBuilder from "./screens/C2RelationshipBuilder";
import CNarrativeWizard from "./screens/CNarrativeWizard";
import COutputWizard from "./screens/COutputWizard";
import C3GeneratingLoader from "./screens/C3GeneratingLoader";
import C4EditorViewer from "./screens/C4EditorViewer";
import C5CoverGenerator from "./screens/C5CoverGenerator";
import LLanding from "./screens/LLanding";
import AAuthOnboarding from "./screens/AAuthOnboarding";
import DLibrary from "./screens/DLibrary";
import DWorkDetail from "./screens/DWorkDetail";
import PPayment from "./screens/PPayment";
import PMyPage from "./screens/PMyPage";
import MMarketHome from "./screens/MMarketHome";
import MSalesPage from "./screens/MSalesPage";
import MReader from "./screens/MReader";
import TTipModal from "./screens/TTipModal";
import SRegister from "./screens/SRegister";
import SDashboard from "./screens/SDashboard";
import RReport from "./screens/RReport";
import OAdminConsole from "./screens/OAdminConsole";
import ONBOnboarding from "./screens/ONBOnboarding";

/**
 * 플롯위버 프론트 — 구현된 화면 미리보기.
 * (실서비스 라우트: C1 /create · C2 /create/relations · C3 /create/generating)
 * 좌하단 개발용 스위처로 화면을 전환한다.
 */
const SCREENS = [
  { key: "c1", label: "C1 위저드 ①기본설정", Comp: C1SettingsWizard },
  { key: "c-narr", label: "C 위저드 ②서사설정", Comp: CNarrativeWizard },
  { key: "c2", label: "C2 위저드 ③관계도", Comp: C2RelationshipBuilder },
  { key: "c-out", label: "C 위저드 ④출력설정", Comp: COutputWizard },
  { key: "c3", label: "C3 생성 로딩", Comp: C3GeneratingLoader },
  { key: "c4", label: "C4 에디터/뷰어", Comp: C4EditorViewer },
  { key: "c5", label: "C5 표지 생성", Comp: C5CoverGenerator },
  { key: "l", label: "L 랜딩 v2", Comp: LLanding },
  { key: "a", label: "A 인증·온보딩", Comp: AAuthOnboarding },
  { key: "onb", label: "ONB 온보딩 투어", Comp: ONBOnboarding },
  { key: "d1", label: "D1 내 작업실", Comp: DLibrary },
  { key: "d2", label: "D2 작품 상세", Comp: DWorkDetail },
  { key: "p1", label: "P1 결제·요금제", Comp: PPayment },
  { key: "p2", label: "P2 마이페이지·지갑", Comp: PMyPage },
  { key: "m1", label: "M1 마켓 홈", Comp: MMarketHome },
  { key: "m2", label: "M2 판매페이지", Comp: MSalesPage },
  { key: "m3", label: "M3 읽기 뷰어", Comp: MReader },
  { key: "tip", label: "TIP 후원 모달", Comp: TTipModal },
  { key: "s2", label: "S2 작품 등록", Comp: SRegister },
  { key: "s1", label: "S1 정산 대시보드", Comp: SDashboard },
  { key: "r", label: "R 신고", Comp: RReport },
  { key: "o", label: "O 어드민 검수", Comp: OAdminConsole },
] as const;

export default function App() {
  const [active, setActive] = useState<(typeof SCREENS)[number]["key"]>("c1");
  const Current = SCREENS.find((s) => s.key === active)!.Comp;

  return (
    <>
      <Current />

      {/* 개발용 화면 스위처 */}
      <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-1 rounded-full border border-hairline bg-white/95 p-1 shadow-pop backdrop-blur">
        {SCREENS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-bold transition " +
              (active === s.key ? "bg-brand text-white" : "bg-transparent text-ink2 hover:bg-wash")
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}
