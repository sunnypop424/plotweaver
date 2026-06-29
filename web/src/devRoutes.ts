/**
 * 개발용 화면 스위처 목록 (좌하단 DevNav).
 * 실서비스에서는 제거 가능. 경로는 routes.tsx의 라우트와 1:1.
 */
export type DevRoute = { path: string; label: string };

export const DEV_ROUTES: DevRoute[] = [
  { path: "/create/world", label: "C0 ①세계관" },
  { path: "/create", label: "C1 ②기본설정" },
  { path: "/create/narrative", label: "C ③서사설정" },
  { path: "/create/relations", label: "C2 ④관계도" },
  { path: "/create/output", label: "C ⑤출력설정" },
  { path: "/create/generating", label: "C3 생성" },
  { path: "/works/1/edit", label: "C4 에디터" },
  { path: "/works/1/cover", label: "C5 표지" },
  { path: "/", label: "L 랜딩" },
  { path: "/login", label: "A 로그인" },
  { path: "/signup", label: "A 가입" },
  { path: "/find-id", label: "A 계정찾기" },
  { path: "/terms", label: "약관" },
  { path: "/contact", label: "문의" },
  { path: "/onboarding", label: "ONB 온보딩" },
  { path: "/library", label: "D1 작업실" },
  { path: "/works/1", label: "D2 작품상세" },
  { path: "/billing", label: "P1 결제" },
  { path: "/me", label: "P2 마이" },
  { path: "/market", label: "M1 마켓" },
  { path: "/market/1", label: "M2 판매" },
  { path: "/read/1", label: "M3 읽기" },
  { path: "/tip", label: "TIP 후원" },
  { path: "/seller/register", label: "S2 등록" },
  { path: "/seller", label: "S1 정산" },
  { path: "/report", label: "R 신고" },
  { path: "/admin", label: "O 어드민" },
];
