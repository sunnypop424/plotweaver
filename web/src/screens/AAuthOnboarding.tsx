import { useRef, useState } from "react";
import { Toast, useToast } from "../components/Toast";

type Step = "login" | "terms" | "guardian" | "adult";

const STEP_TABS: { key: Step; label: string }[] = [
  { key: "login", label: "로그인" },
  { key: "terms", label: "약관" },
  { key: "guardian", label: "대리인" },
  { key: "adult", label: "성인인증" },
];
const SUBTITLES: Record<Step, string> = {
  login: "설정만 넣으면 AI가 웹소설을 완성합니다",
  terms: "거의 다 왔어요",
  guardian: "안전한 가입을 위해",
  adult: "연령 확인",
};
const TERM_DEFS = [
  { key: "service", label: "서비스 이용약관", required: true },
  { key: "privacy", label: "개인정보 수집·이용", required: true },
  { key: "marketing", label: "마케팅 정보 수신", required: false },
] as const;
type TermKey = (typeof TERM_DEFS)[number]["key"];

export default function AAuthOnboarding() {
  const { toast, showToast } = useToast();
  const [step, setStep] = useState<Step>("login");
  const [terms, setTerms] = useState<Record<TermKey, boolean>>({ service: false, privacy: false, marketing: false });
  const [guardian, setGuardian] = useState({ name: "", phone: "", rel: "부", consent: false, touched: false });
  const [adultLoading, setAdultLoading] = useState(false);
  const [adultBlocked, setAdultBlocked] = useState(false);
  const avTimer = useRef<number | undefined>(undefined);

  const go = (s: Step) => { setStep(s); setAdultBlocked(false); };

  // terms
  const allOn = terms.service && terms.privacy && terms.marketing;
  const toggleTerm = (k: TermKey) => setTerms((t) => ({ ...t, [k]: !t[k] }));
  const toggleAll = () => { const v = !allOn; setTerms({ service: v, privacy: v, marketing: v }); };
  const termsBlocked = !(terms.service && terms.privacy);

  // guardian
  const gBlocked = !(guardian.name.trim() && guardian.phone.trim() && guardian.consent);
  const submitGuardian = () => {
    if (!gBlocked) showToast("보호자에게 동의 확인 문자를 보냈어요");
    else setGuardian((g) => ({ ...g, touched: true }));
  };

  // adult
  const runVerify = (msg: string) => {
    setAdultLoading(true); setAdultBlocked(false);
    avTimer.current = window.setTimeout(() => { setAdultLoading(false); showToast(msg); }, 1400);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* demo step switcher */}
      <div className="fixed left-1/2 top-3.5 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        {STEP_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={"rounded-full px-3.5 py-2 text-[13px] font-bold transition " + (step === t.key ? "bg-brand text-white" : "bg-transparent text-muted")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-[88px]">
        <div className="w-full max-w-[440px]">
          {/* logo */}
          <div className="mb-7 text-center">
            <div className="text-[26px] font-bold tracking-[-0.6px] text-brand">플롯위버</div>
            <div className="mt-1.5 text-sm text-muted">{SUBTITLES[step]}</div>
          </div>

          {/* CARD */}
          <div className="rounded-xl border border-hairline bg-white px-7 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            {step === "login" && <LoginStep onNext={() => go("terms")} />}
            {step === "terms" && (
              <TermsStep terms={terms} allOn={allOn} blocked={termsBlocked} onToggle={toggleTerm} onToggleAll={toggleAll} onView={(l) => showToast(`「${l}」 전문 보기`)} onSubmit={() => !termsBlocked && showToast("약관 동의 완료 — 다음 단계로")} />
            )}
            {step === "guardian" && (
              <GuardianStep g={guardian} blocked={gBlocked} onChange={(p) => setGuardian((g) => ({ ...g, ...p, touched: true }))} onSubmit={submitGuardian} />
            )}
            {step === "adult" && (
              <AdultStep loading={adultLoading} blocked={adultBlocked} onPass={() => runVerify("PASS 본인인증 완료 — 성인 확인됨")} onPhone={() => runVerify("휴대폰 본인인증 완료 — 성인 확인됨")} onDemoBlock={() => setAdultBlocked(true)} />
            )}
          </div>

          <div className="mt-5 text-center text-xs text-[#b4b4b4]">© 2026 플롯위버</div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

/* ── 체크 박스 ─────────────────────────────────────────────────────────── */
function Check({ on, round = false }: { on: boolean; round?: boolean }) {
  return (
    <span
      className={
        "flex flex-shrink-0 items-center justify-center text-sm font-bold text-white transition " +
        (round ? "h-[22px] w-[22px] rounded-full " : "h-6 w-6 rounded-md ") +
        (on ? "border-[1.5px] border-brand bg-brand" : "border-[1.5px] border-[#d4d4d4] bg-white")
      }
    >
      {on ? "✓" : ""}
    </span>
  );
}

/* ── A: 로그인 ─────────────────────────────────────────────────────────── */
function LoginStep({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ animation: "pw-fade .25s ease" }}>
      <div className="mb-1.5 text-center text-xl font-bold text-ink">시작하기</div>
      <div className="mb-[26px] text-center text-sm leading-[1.5] text-muted">소셜 계정으로 1초 만에 시작하세요.</div>

      <div className="flex flex-col gap-2.5">
        <button onClick={onNext} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border-none text-base font-bold" style={{ background: "#FEE500", color: "#191600" }}>
          <span className="text-lg">💬</span>카카오로 계속하기
        </button>
        <button onClick={onNext} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border border-line2 bg-white text-base font-bold text-ink transition hover:bg-canvas">
          <span className="text-[17px] font-bold" style={{ color: "#4285F4" }}>G</span>구글로 계속하기
        </button>
        <button onClick={onNext} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border-none text-base font-bold text-white" style={{ background: "#121212" }}>
          Apple로 계속하기
        </button>
      </div>

      <div className="my-[22px] flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-xs font-bold text-[#b4b4b4]">또는</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      <button onClick={onNext} className="h-[50px] w-full rounded border border-brand bg-white text-[15px] font-bold text-brand transition hover:bg-wash">이메일로 계속하기</button>

      <div className="mt-[22px] text-center text-xs leading-[1.6] text-muted">
        계속 진행하면 <span className="font-bold text-ink2">이용약관</span> 및 <span className="font-bold text-ink2">개인정보처리방침</span>에<br />동의하는 것으로 간주됩니다.
      </div>
    </div>
  );
}

/* ── A1: 약관 ─────────────────────────────────────────────────────────── */
function TermsStep({ terms, allOn, blocked, onToggle, onToggleAll, onView, onSubmit }: {
  terms: Record<TermKey, boolean>; allOn: boolean; blocked: boolean;
  onToggle: (k: TermKey) => void; onToggleAll: () => void; onView: (l: string) => void; onSubmit: () => void;
}) {
  return (
    <div style={{ animation: "pw-fade .25s ease" }}>
      <div className="mb-1.5 text-xl font-bold text-ink">약관에 동의해 주세요</div>
      <div className="mb-[22px] text-sm leading-[1.5] text-muted">서비스 이용을 위해 아래 약관 동의가 필요해요.</div>

      <button onClick={onToggleAll} className="mb-3.5 flex w-full items-center gap-3 rounded-lg border border-wash-border bg-wash p-4 text-left">
        <Check on={allOn} />
        <span className="text-base font-bold text-ink">전체 동의</span>
      </button>

      <div className="flex flex-col gap-0.5">
        {TERM_DEFS.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-2 px-1.5 py-3">
            <button onClick={() => onToggle(d.key)} className="flex min-w-0 flex-1 items-center gap-[11px] border-none bg-transparent p-0 text-left">
              <Check on={terms[d.key]} round />
              <span className="text-sm font-bold text-ink2">{d.required ? "(필수)" : "(선택)"} {d.label}</span>
            </button>
            <button onClick={() => onView(d.label)} className="flex-shrink-0 border-none bg-transparent px-1.5 py-1 text-[13px] text-[#b4b4b4] transition hover:text-brand">보기 ›</button>
          </div>
        ))}
      </div>

      <button disabled={blocked} onClick={onSubmit} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (blocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>
        동의하고 계속
      </button>
    </div>
  );
}

/* ── A2: 법정대리인 ───────────────────────────────────────────────────── */
function GuardianStep({ g, blocked, onChange, onSubmit }: {
  g: { name: string; phone: string; rel: string; consent: boolean; touched: boolean };
  blocked: boolean; onChange: (p: Partial<{ name: string; phone: string; rel: string; consent: boolean }>) => void; onSubmit: () => void;
}) {
  const nameErr = g.touched && !g.name.trim();
  const phoneErr = g.touched && !g.phone.trim();
  return (
    <div style={{ animation: "pw-fade .25s ease" }}>
      <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-xs font-bold text-brand">만 14세 미만</div>
      <div className="mb-1.5 text-xl font-bold text-ink">법정대리인 동의가 필요해요</div>
      <div className="mb-[22px] text-sm leading-[1.6] text-muted">만 14세 미만 회원은 보호자(법정대리인)의 동의가 있어야 가입할 수 있어요. 보호자 정보를 입력해 주세요.</div>

      <div className="flex flex-col gap-4">
        <Field label="보호자 이름">
          <input value={g.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="보호자 성함" className={"pw-input h-[50px] text-[15px]" + (nameErr ? " pw-input--err" : "")} />
        </Field>
        <Field label="보호자 휴대폰 번호">
          <input value={g.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="010-0000-0000" className={"pw-input h-[50px] text-[15px]" + (phoneErr ? " pw-input--err" : "")} />
        </Field>
        <Field label="관계">
          <div className="pw-select-wrap">
            <select value={g.rel} onChange={(e) => onChange({ rel: e.target.value })} className="pw-select h-[50px] text-[15px]">
              <option value="부">부</option>
              <option value="모">모</option>
              <option value="조부모">조부모</option>
              <option value="기타 법정대리인">기타 법정대리인</option>
            </select>
            <span className="pw-select-caret">▼</span>
          </div>
        </Field>

        <button onClick={() => onChange({ consent: !g.consent })} className="flex items-start gap-[11px] rounded-lg border border-hairline bg-[#fafafa] p-3.5 text-left">
          <Check on={g.consent} round />
          <span className="text-[13px] font-bold leading-[1.5] text-ink2">보호자가 본 약관 및 미성년자 회원 가입에 동의합니다. (필수)</span>
        </button>
      </div>

      <button disabled={blocked} onClick={onSubmit} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (blocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>
        동의 요청 보내기
      </button>
      <div className="mt-3 text-center text-xs leading-[1.5] text-muted">입력한 번호로 보호자 동의 확인 문자가 발송됩니다.</div>
    </div>
  );
}

/* ── AV: 성인 인증 ────────────────────────────────────────────────────── */
function AdultStep({ loading, blocked, onPass, onPhone, onDemoBlock }: {
  loading: boolean; blocked: boolean; onPass: () => void; onPhone: () => void; onDemoBlock: () => void;
}) {
  return (
    <div className="text-center" style={{ animation: "pw-fade .25s ease" }}>
      <div className="mx-auto mb-[18px] flex h-14 w-14 items-center justify-center rounded-full bg-wash text-2xl font-bold text-brand">19</div>
      <div className="mb-1.5 text-xl font-bold text-ink">성인 인증이 필요해요</div>
      <div className="mb-6 text-sm leading-[1.6] text-muted">이 콘텐츠는 만 19세 이상만 이용할 수 있어요.<br />본인 명의 인증으로 한 번만 확인하면 돼요.</div>

      {blocked && (
        <div className="mb-5 flex items-start gap-[11px] rounded-lg border border-[#fcdada] bg-error-wash p-4 text-left">
          <span className="text-lg font-bold leading-tight text-error">!</span>
          <div>
            <div className="text-sm font-bold text-error">이용할 수 없는 콘텐츠예요</div>
            <div className="mt-1 text-[13px] leading-[1.5] text-[#9a5b5b]">만 19세 미만 회원은 성인 콘텐츠를 이용할 수 없습니다. 가입은 정상적으로 이용 가능해요.</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <button disabled={loading} onClick={onPass} className={"flex h-[54px] w-full items-center justify-center rounded border-none bg-brand text-base font-bold text-white transition " + (loading ? "opacity-90" : "hover:bg-brand-hover")} style={loading ? { cursor: "default" } : undefined}>
          {loading ? (
            <><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-2px]" />인증 중...</>
          ) : "PASS로 본인인증"}
        </button>
        <button disabled={loading} onClick={onPhone} className="h-[54px] w-full rounded border border-line2 bg-white text-base font-bold text-ink transition hover:bg-canvas">휴대폰 본인인증</button>
      </div>

      <button onClick={onDemoBlock} className="mt-[18px] border-none bg-transparent text-xs text-[#b4b4b4] underline">(데모) 미성년 차단 상태 보기</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-[7px] pw-field-label">{label}</div>
      {children}
    </div>
  );
}
