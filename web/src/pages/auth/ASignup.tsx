import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

const STEPS = ["약관", "정보입력", "완료"];
const TERM_DEFS = [
  { key: "service", label: "서비스 이용약관", required: true },
  { key: "privacy", label: "개인정보 수집·이용", required: true },
  { key: "marketing", label: "마케팅 정보 수신", required: false },
] as const;
type TermKey = (typeof TERM_DEFS)[number]["key"];

export default function ASignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [terms, setTerms] = useState<Record<TermKey, boolean>>({ service: false, privacy: false, marketing: false });
  const [info, setInfo] = useState({ email: "", pw: "", pw2: "", nick: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allOn = terms.service && terms.privacy && terms.marketing;
  const toggleTerm = (k: TermKey) => setTerms((t) => ({ ...t, [k]: !t[k] }));
  const toggleAll = () => { const v = !allOn; setTerms({ service: v, privacy: v, marketing: v }); };
  const termsOk = terms.service && terms.privacy;

  const pwMismatch = !!info.pw2 && info.pw !== info.pw2;
  const infoOk = info.email.trim() && info.pw.length >= 8 && info.pw === info.pw2 && info.nick.trim();

  const back = () => (step === 0 ? navigate("/login") : setStep((s) => s - 1));

  const signup = async () => {
    if (!infoOk) return;
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: info.email.trim(),
        password: info.pw,
        options: { data: { nickname: info.nick.trim() } },
      });
      if (err) { setError(err.message); return; }
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="회원가입" maxWidth={460} back={<button onClick={back} className="mb-4 inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-bold text-muted transition hover:text-brand">← {step === 0 ? "로그인" : "이전"}</button>}>
      <div className="mb-5 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={"flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold " + (i < step ? "bg-wash text-brand" : i === step ? "bg-brand text-white" : "border border-line2 bg-white text-muted")}>{i < step ? "✓" : i + 1}</span>
            {i < STEPS.length - 1 && <span className={"h-0.5 w-6 " + (i < step ? "bg-brand" : "bg-hairline")} />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-hairline bg-white px-7 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* STEP 0 — 약관 */}
        {step === 0 && (
          <div>
            <div className="mb-1.5 text-xl font-bold text-ink">약관에 동의해 주세요</div>
            <div className="mb-[22px] text-sm leading-[1.5] text-muted">서비스 이용을 위해 아래 약관 동의가 필요해요.</div>
            <button onClick={toggleAll} className="mb-3.5 flex w-full items-center gap-3 rounded-lg border border-wash-border bg-wash p-4 text-left">
              <Check on={allOn} /><span className="text-base font-bold text-ink">전체 동의</span>
            </button>
            <div className="flex flex-col gap-0.5">
              {TERM_DEFS.map((d) => (
                <div key={d.key} className="flex items-center justify-between gap-2 px-1.5 py-3">
                  <button onClick={() => toggleTerm(d.key)} className="flex min-w-0 flex-1 items-center gap-[11px] border-none bg-transparent p-0 text-left">
                    <Check on={terms[d.key]} round />
                    <span className="text-sm font-bold text-ink2">{d.required ? "(필수)" : "(선택)"} {d.label}</span>
                  </button>
                </div>
              ))}
            </div>
            <PrimaryBtn disabled={!termsOk} onClick={() => setStep(1)}>동의하고 계속</PrimaryBtn>
          </div>
        )}

        {/* STEP 1 — 정보입력 */}
        {step === 1 && (
          <div>
            <div className="mb-1.5 text-xl font-bold text-ink">기본 정보를 입력해 주세요</div>
            <div className="mb-[22px] text-sm leading-[1.5] text-muted">로그인에 사용할 정보예요.</div>
            <div className="flex flex-col gap-4">
              <Field label="이메일 (아이디)">
                <input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="you@example.com" className="pw-input h-[50px] text-[15px]" />
              </Field>
              <Field label="비밀번호 (8자 이상)">
                <input type="password" value={info.pw} onChange={(e) => setInfo({ ...info, pw: e.target.value })} placeholder="8자 이상" className="pw-input h-[50px] text-[15px]" />
              </Field>
              <Field label="비밀번호 확인">
                <input type="password" value={info.pw2} onChange={(e) => setInfo({ ...info, pw2: e.target.value })} placeholder="비밀번호 재입력" className={"pw-input h-[50px] text-[15px]" + (pwMismatch ? " pw-input--err" : "")} />
                {pwMismatch && <div className="mt-1.5 text-[13px] font-bold text-error">비밀번호가 일치하지 않아요.</div>}
              </Field>
              <Field label="닉네임 (작가명)">
                <input value={info.nick} onChange={(e) => setInfo({ ...info, nick: e.target.value })} placeholder="작가명으로 표시돼요" className="pw-input h-[50px] text-[15px]" />
              </Field>
            </div>
            {error && <div className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2.5 text-[13px] font-bold text-error">{error}</div>}
            <PrimaryBtn disabled={!infoOk || loading} onClick={signup}>{loading ? "가입 중..." : "가입 완료"}</PrimaryBtn>
          </div>
        )}

        {/* STEP 2 — 완료 */}
        {step === 2 && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-wash text-3xl font-bold text-brand">✓</div>
            <div className="mb-1.5 text-xl font-bold text-ink">가입이 완료됐어요!</div>
            <div className="mb-7 text-sm leading-[1.6] text-muted">이제 설정만 넣으면 AI가 웹소설을 완성해줘요.<br />첫 작품을 만들어볼까요?</div>
            <button onClick={() => navigate("/create/world")} className="h-[54px] w-full rounded border-none bg-brand text-base font-bold text-white shadow-cta transition hover:bg-brand-hover">시작하기 →</button>
            <button onClick={() => navigate("/library")} className="mt-2.5 h-12 w-full rounded border border-line2 bg-white text-[15px] font-bold text-ink2 transition hover:bg-wash">작업실로 가기</button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function PrimaryBtn({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (disabled ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>{children}</button>
  );
}
function Check({ on, round = false }: { on: boolean; round?: boolean }) {
  return (
    <span className={"flex flex-shrink-0 items-center justify-center text-sm font-bold text-white transition " + (round ? "h-[22px] w-[22px] rounded-full " : "h-6 w-6 rounded-md ") + (on ? "border-[1.5px] border-brand bg-brand" : "border-[1.5px] border-[#d4d4d4] bg-white")}>{on ? "✓" : ""}</span>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><div className="mb-[7px] pw-field-label">{label}</div>{children}</div>);
}
