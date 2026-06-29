import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";

/** 문의하기 — 유형별 문의 폼 + 간단 FAQ. */
const TYPES = ["결제·환불", "계정·로그인", "창작·생성 오류", "판매·정산", "신고·저작권", "기타"];
const FAQ = [
  { q: "생성 중 오류가 났는데 크레딧이 차감됐나요?", a: "생성 실패 시 크레딧은 차감되지 않아요. 차감된 것으로 보이면 문의해 주세요." },
  { q: "작품을 판매하려면 어떻게 하나요?", a: "에디터에서 직접 편집해 창작 기여 기준을 충족한 뒤, 작품 상세 → 판매 등록에서 신청할 수 있어요." },
  { q: "환불은 어떻게 받나요?", a: "마이페이지 → 구매내역에서 환불 가능 여부를 확인하고 신청할 수 있어요." },
];

export default function AContact() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [type, setType] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  const ok = type && email.trim() && title.trim() && body.trim();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="text-lg font-bold tracking-[-0.2px] text-ink">문의하기</div>
        <button onClick={() => navigate("/")} className="pw-btn-slight h-10 px-4 text-sm">홈</button>
      </div>

      <div className="mx-auto box-border w-full px-5 py-8" style={{ maxWidth: 720 }}>
        {sent ? (
          <div className="pw-card p-9 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-wash text-3xl font-bold text-brand">✓</div>
            <div className="mb-1.5 text-xl font-bold text-ink">문의가 접수됐어요</div>
            <div className="mb-7 text-sm leading-[1.6] text-muted">입력하신 이메일로 답변을 보내드릴게요.<br />보통 1영업일 이내에 답변돼요.</div>
            <div className="flex justify-center gap-2.5">
              <button onClick={() => { setSent(false); setType(""); setEmail(""); setTitle(""); setBody(""); }} className="h-12 rounded border border-line2 bg-white px-5 text-[15px] font-bold text-ink2 transition hover:bg-wash">새 문의 작성</button>
              <button onClick={() => navigate("/")} className="h-12 rounded border-none bg-brand px-6 text-[15px] font-bold text-white transition hover:bg-brand-hover">홈으로</button>
            </div>
          </div>
        ) : (
          <>
            <div className="pw-card mb-4 p-7">
              <div className="mb-1 text-xl font-bold text-ink">무엇을 도와드릴까요?</div>
              <div className="mb-6 text-[13px] text-muted">문의 유형과 내용을 남겨주시면 이메일로 답변드려요.</div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1.5 pw-field-label">문의 유형</div>
                  <div className="pw-select-wrap">
                    <select value={type} onChange={(e) => setType(e.target.value)} className="pw-select h-[50px] text-[15px]">
                      <option value="">선택해 주세요</option>
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="pw-select-caret">▼</span>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 pw-field-label">답변 받을 이메일</div>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pw-input h-[50px] text-[15px]" />
                </div>
                <div>
                  <div className="mb-1.5 pw-field-label">제목</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문의 제목" className="pw-input h-[50px] text-[15px]" />
                </div>
                <div>
                  <div className="mb-1.5 pw-field-label">문의 내용</div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="문의하실 내용을 자세히 적어주세요." className="min-h-[140px] w-full resize-y rounded border border-hairline bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink outline-none transition focus:border-brand focus:shadow-focus" />
                </div>
              </div>

              <button disabled={!ok} onClick={() => { setSent(true); showToast("문의가 접수됐어요"); }} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (ok ? "bg-brand text-white hover:bg-brand-hover" : "cursor-default bg-hairline text-[#b4b4b4]")}>문의 보내기</button>
            </div>

            <div className="pw-card p-7">
              <div className="mb-4 text-base font-bold text-ink">자주 묻는 질문</div>
              <div className="flex flex-col gap-4">
                {FAQ.map((f) => (
                  <div key={f.q}>
                    <div className="mb-1 text-sm font-bold text-ink">Q. {f.q}</div>
                    <div className="text-sm leading-[1.6] text-ink2">{f.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
