import { useState } from "react";
import { useNavigate } from "react-router-dom";

/** 이용약관 / 개인정보처리방침 — 정적 문서 페이지(탭). */
const TERMS = [
  { h: "제1조 (목적)", b: "본 약관은 플롯위버(이하 “회사”)가 제공하는 AI 웹소설 창작·거래 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다." },
  { h: "제2조 (정의)", b: "“회원”이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다. “창작물”이란 회원이 서비스를 통해 생성·편집한 텍스트·이미지 등을 말합니다." },
  { h: "제3조 (AI 생성물과 창작 기여)", b: "AI가 생성한 결과물은 회원의 설정 입력과 편집을 통해 완성됩니다. 판매를 위해서는 회사가 정한 창작 기여 기준을 충족해야 하며, 기여 등급은 회차별로 표기됩니다." },
  { h: "제4조 (저작권 및 책임)", b: "회원은 자신이 등록·판매하는 창작물이 타인의 권리를 침해하지 않음을 보증합니다. 침해로 인한 책임은 회원에게 있으며, 회사는 신고·검수 절차에 따라 조치할 수 있습니다." },
  { h: "제5조 (결제 및 환불)", b: "유료 콘텐츠·크레딧 결제 및 환불은 관련 법령과 회사의 환불 정책에 따릅니다. 미성년 회원은 법정 한도 내에서만 결제할 수 있습니다." },
  { h: "제6조 (서비스 변경·중단)", b: "회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 사전 고지를 원칙으로 합니다." },
];
const PRIVACY = [
  { h: "1. 수집하는 개인정보 항목", b: "회원가입·서비스 이용 과정에서 이메일, 닉네임, 생년월일, 결제정보, 본인확인 정보 등을 수집합니다." },
  { h: "2. 개인정보의 이용 목적", b: "회원 식별·관리, 콘텐츠 제공, 결제·정산, 고객 문의 대응, 연령 확인 및 법령상 의무 이행을 위해 이용합니다." },
  { h: "3. 보유 및 이용 기간", b: "회원 탈퇴 시 지체 없이 파기함을 원칙으로 하되, 관련 법령에서 정한 기간 동안 보관할 수 있습니다." },
  { h: "4. 제3자 제공 및 위탁", b: "법령에 근거하거나 회원이 동의한 경우를 제외하고 개인정보를 외부에 제공하지 않습니다. 결제·인증 등 일부 업무는 외부에 위탁할 수 있습니다." },
  { h: "5. 이용자의 권리", b: "회원은 언제든 자신의 개인정보를 조회·수정·삭제하거나 처리 정지를 요청할 수 있습니다." },
];

export default function ATerms({ initial = "terms" }: { initial?: "terms" | "privacy" }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"terms" | "privacy">(initial);
  const doc = tab === "terms" ? TERMS : PRIVACY;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="text-lg font-bold tracking-[-0.2px] text-ink">약관 및 정책</div>
        <button onClick={() => navigate("/")} className="pw-btn-slight h-10 px-4 text-sm">홈</button>
      </div>

      <div className="mx-auto box-border w-full px-5 py-8" style={{ maxWidth: 760 }}>
        <div className="mb-6 flex gap-1 rounded-full border border-hairline bg-white p-1">
          <button onClick={() => setTab("terms")} className={"h-10 flex-1 rounded-full text-sm font-bold transition " + (tab === "terms" ? "bg-brand text-white" : "bg-transparent text-muted")}>이용약관</button>
          <button onClick={() => setTab("privacy")} className={"h-10 flex-1 rounded-full text-sm font-bold transition " + (tab === "privacy" ? "bg-brand text-white" : "bg-transparent text-muted")}>개인정보처리방침</button>
        </div>

        <div className="pw-card p-7">
          <div className="mb-1 text-xl font-bold text-ink">{tab === "terms" ? "서비스 이용약관" : "개인정보처리방침"}</div>
          <div className="mb-6 text-[13px] text-muted">시행일 2026년 6월 29일 · 본 문서는 프로토타입용 예시입니다.</div>
          <div className="flex flex-col gap-6">
            {doc.map((s) => (
              <div key={s.h}>
                <div className="mb-1.5 text-[15px] font-bold text-ink">{s.h}</div>
                <div className="text-sm leading-[1.7] text-ink2">{s.b}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-hairline pt-5 text-[13px] text-muted">
            문의가 있으신가요? <button onClick={() => navigate("/contact")} className="font-bold text-brand">문의하기 ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
