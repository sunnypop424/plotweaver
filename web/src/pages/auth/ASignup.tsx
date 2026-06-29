import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { AuthShell } from "@/components/AuthShell";

/** 회원가입 플로우 — 약관 → 정보입력 → 본인인증(만14세 미만이면 법정대리인) → 완료. */
const STEPS = ["약관", "정보입력", "본인인증", "완료"];
const TERM_DEFS = [
  { key: "service", label: "서비스 이용약관", required: true },
  { key: "privacy", label: "개인정보 수집·이용", required: true },
  { key: "marketing", label: "마케팅 정보 수신", required: false },
] as const;
type TermKey = (typeof TERM_DEFS)[number]["key"];

export default function ASignup() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);

  const [terms, setTerms] = useState<Record<TermKey, boolean>>({ service: false, privacy: false, marketing: false });
  const [info, setInfo] = useState({ email: "", pw: "", pw2: "", nick: "", birth: "" });
  const [guardian, setGuardian] = useState({ name: "", phone: "", rel: "부", consent: false });
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const allOn = terms.service && terms.privacy && terms.marketing;
  const toggleTerm = (k: TermKey) => setTerms((t) => ({ ...t, [k]: !t[k] }));
  const toggleAll = () => { const v = !allOn; setTerms({ service: v, privacy: v, marketing: v }); };
  const termsOk = terms.service && terms.privacy;

  const pwMismatch = !!info.pw2 && info.pw !== info.pw2;
  const infoOk = info.email.trim() && info.pw.trim() && info.pw === info.pw2 && info.nick.trim() && !!info.birth;

  const birthYear = info.birth ? Number(info.birth.slice(0, 4)) : 0;
  const under14 = birthYear > 0 && 2026 - birthYear < 14;
  const guardianOk = guardian.name.trim() && guardian.phone.trim() && guardian.consent;
  const verifyOk = under14 ? guardianOk : verified;

  const runVerify = () => {
    setVerifyLoading(true);
    window.setTimeout(() => { setVerifyLoading(false); setVerified(true); showToast("휴대폰 본인인증 완료"); }, 1300);
  };

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => (step === 0 ? navigate("/login") : setStep((s) => s - 1));

  return (
    <AuthShell subtitle="회원가입" maxWidth={460} back={<button onClick={back} className="mb-4 inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-bold text-muted transition hover:text-brand">← {step === 0 ? "로그인" : "이전"}</button>}>
          {/* stepper */}
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
                      <button onClick={() => showToast(`「${d.label}」 전문 보기`)} className="flex-shrink-0 border-none bg-transparent px-1.5 py-1 text-[13px] text-[#b4b4b4] transition hover:text-brand">보기 ›</button>
                    </div>
                  ))}
                </div>
                <PrimaryBtn disabled={!termsOk} onClick={next}>동의하고 계속</PrimaryBtn>
              </div>
            )}

            {/* STEP 1 — 정보입력 */}
            {step === 1 && (
              <div>
                <div className="mb-1.5 text-xl font-bold text-ink">기본 정보를 입력해 주세요</div>
                <div className="mb-[22px] text-sm leading-[1.5] text-muted">로그인에 사용할 정보예요.</div>
                <div className="flex flex-col gap-4">
                  <Field label="이메일 (아이디)"><input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="you@example.com" className="pw-input h-[50px] text-[15px]" /></Field>
                  <Field label="비밀번호"><input type="password" value={info.pw} onChange={(e) => setInfo({ ...info, pw: e.target.value })} placeholder="8자 이상" className="pw-input h-[50px] text-[15px]" /></Field>
                  <Field label="비밀번호 확인">
                    <input type="password" value={info.pw2} onChange={(e) => setInfo({ ...info, pw2: e.target.value })} placeholder="비밀번호 재입력" className={"pw-input h-[50px] text-[15px]" + (pwMismatch ? " pw-input--err" : "")} />
                    {pwMismatch && <div className="mt-1.5 text-[13px] font-bold text-error">비밀번호가 일치하지 않아요.</div>}
                  </Field>
                  <Field label="닉네임"><input value={info.nick} onChange={(e) => setInfo({ ...info, nick: e.target.value })} placeholder="작가명으로 표시돼요" className="pw-input h-[50px] text-[15px]" /></Field>
                  <Field label="생년월일"><input type="date" value={info.birth} onChange={(e) => setInfo({ ...info, birth: e.target.value })} className="pw-input h-[50px] text-[15px]" /></Field>
                </div>
                <PrimaryBtn disabled={!infoOk} onClick={next}>다음</PrimaryBtn>
              </div>
            )}

            {/* STEP 2 — 본인인증 / 법정대리인 */}
            {step === 2 && (
              <div>
                {under14 ? (
                  <>
                    <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-xs font-bold text-brand">만 14세 미만</div>
                    <div className="mb-1.5 text-xl font-bold text-ink">법정대리인 동의가 필요해요</div>
                    <div className="mb-[22px] text-sm leading-[1.6] text-muted">보호자(법정대리인) 정보를 입력하면 동의 확인 문자가 발송돼요.</div>
                    <div className="flex flex-col gap-4">
                      <Field label="보호자 이름"><input value={guardian.name} onChange={(e) => setGuardian({ ...guardian, name: e.target.value })} placeholder="보호자 성함" className="pw-input h-[50px] text-[15px]" /></Field>
                      <Field label="보호자 휴대폰 번호"><input value={guardian.phone} onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })} placeholder="010-0000-0000" className="pw-input h-[50px] text-[15px]" /></Field>
                      <Field label="관계">
                        <div className="pw-select-wrap">
                          <select value={guardian.rel} onChange={(e) => setGuardian({ ...guardian, rel: e.target.value })} className="pw-select h-[50px] text-[15px]">
                            <option value="부">부</option><option value="모">모</option><option value="조부모">조부모</option><option value="기타 법정대리인">기타 법정대리인</option>
                          </select><span className="pw-select-caret">▼</span>
                        </div>
                      </Field>
                      <button onClick={() => setGuardian({ ...guardian, consent: !guardian.consent })} className="flex items-start gap-[11px] rounded-lg border border-hairline bg-[#fafafa] p-3.5 text-left">
                        <Check on={guardian.consent} round /><span className="text-[13px] font-bold leading-[1.5] text-ink2">보호자가 본 약관 및 미성년자 회원 가입에 동의합니다. (필수)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-[18px] flex h-14 w-14 items-center justify-center rounded-full bg-wash text-2xl font-bold text-brand">✓</div>
                    <div className="mb-1.5 text-xl font-bold text-ink">본인인증</div>
                    <div className="mb-6 text-sm leading-[1.6] text-muted">안전한 이용을 위해 본인 명의로 한 번만 인증해요.<br />19세 이상이면 성인 콘텐츠도 이용할 수 있어요.</div>
                    <button disabled={verifyLoading || verified} onClick={runVerify} className={"flex h-[54px] w-full items-center justify-center rounded border-none text-base font-bold text-white transition " + (verified ? "bg-[#1f8a5b]" : "bg-brand hover:bg-brand-hover")} style={verifyLoading ? { cursor: "default", opacity: 0.9 } : undefined}>
                      {verifyLoading ? (<><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-2px]" />인증 중...</>) : verified ? "✓ 인증 완료" : "휴대폰 본인인증"}
                    </button>
                  </div>
                )}
                <PrimaryBtn disabled={!verifyOk} onClick={next}>{under14 ? "동의 요청 보내고 완료" : "가입 완료"}</PrimaryBtn>
              </div>
            )}

            {/* STEP 3 — 완료 */}
            {step === 3 && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-wash text-3xl font-bold text-brand">✓</div>
                <div className="mb-1.5 text-xl font-bold text-ink">가입이 완료됐어요!</div>
                <div className="mb-7 text-sm leading-[1.6] text-muted">이제 설정만 넣으면 AI가 웹소설을 완성해줘요.<br />첫 작품을 만들어볼까요?</div>
                <button onClick={() => navigate("/onboarding")} className="h-[54px] w-full rounded border-none bg-brand text-base font-bold text-white shadow-cta transition hover:bg-brand-hover">시작하기 →</button>
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
