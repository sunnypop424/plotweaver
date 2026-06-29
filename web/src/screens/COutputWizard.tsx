import { useRef, useState } from "react";
import { WizardChrome } from "../components/WizardChrome";
import { RadioPill } from "./C1SettingsWizard";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

const POV_OPTS = ["1인칭 주인공", "1인칭 관찰자", "3인칭 전지적", "3인칭 제한적"];
const UNIT_OPTS = [{ k: "1회차씩", l: "1회차씩" }, { k: "일괄", l: "일괄 생성" }];
const COUNT_OPTS = ["단편 (1화)", "10화", "30화"];
const LENGTH_OPTS = [
  { v: "짧게 (2천자)", l: "짧게 · 약 2천자" },
  { v: "보통 (4천자)", l: "보통 · 약 4천자" },
  { v: "길게 (6천자+)", l: "길게 · 6천자 이상" },
];
const RATING_DEFS = [{ k: "all", l: "전체 이용가" }, { k: "15", l: "15세" }, { k: "19", l: "19세" }] as const;
const TONE_OPTS = ["간결·속도감", "서정·묘사 중심", "유머·경쾌", "진중·무게감"];
const COVER_OPTS = ["웹툰풍", "유화풍", "미니멀 타이포", "실사풍"];
const AI_TITLES = ["회귀한 검, 황혼을 베다", "두 번째 검의 맹세", "복수는 회귀로부터", "잿빛 검의 회귀", "황혼의 검사"];
const PREV = { era: "중세 유럽", genres: "회귀 · 복수", chars: "카엘(주인공) 외 2명", goal: "복수", ending: "복수 완성" };

export default function COutputWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { toast, showToast } = useToast();
  const titleT = useRef<number | undefined>(undefined);

  const [pov, setPov] = useState("3인칭 전지적");
  const [count, setCount] = useState({ value: "30화", custom: false, text: "" });
  const [length, setLength] = useState("보통 (4천자)");
  const [unit, setUnit] = useState("1회차씩");
  const [rating, setRating] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [titleLoading, setTitleLoading] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tone, setTone] = useState("간결·속도감");
  const [cover, setCover] = useState("웹툰풍");
  const [keywords, setKeywords] = useState<string[]>(["회귀", "복수극"]);
  const [keywordText, setKeywordText] = useState("");

  const countV = count.custom ? (count.text ? `${count.text}화` : "") : count.value;
  const valid = !!pov && !!countV && !!length && !!unit && !!rating;
  const ratingLabel = RATING_DEFS.find((r) => r.k === rating)!.l;

  const aiTitle = () => {
    setTitleLoading(true);
    titleT.current = window.setTimeout(() => { setCandidates(AI_TITLES); setTitleLoading(false); }, 1200);
  };
  const addKeyword = () => {
    const t = keywordText.trim();
    if (t && !keywords.includes(t)) setKeywords((k) => [...k, t]);
    setKeywordText("");
  };

  const summaryRows: { label: string; value: string; tone?: "muted" | "brand" | "error" }[] = [
    { label: "배경 시대", value: PREV.era },
    { label: "장르", value: PREV.genres },
    { label: "등장인물", value: PREV.chars },
    { label: "목표 · 결말", value: `${PREV.goal} · ${PREV.ending}` },
    { label: "시점", value: pov },
    { label: "회차", value: `${countV || "미정"} · ${length}`, tone: countV ? undefined : "muted" },
    { label: "생성 단위", value: unit },
    { label: "연령 등급", value: ratingLabel, tone: rating === "19" ? "error" : undefined },
    { label: "제목", value: title.trim() || "생성 후 자동 부여", tone: title.trim() ? "brand" : "muted" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome current={4} isMobile={isMobile} onBack={() => showToast("③관계도로 돌아갑니다")} onSaveDraft={() => showToast("임시저장됨")} />

      <div className="mx-auto box-border w-full" style={isDesktop ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" } : { maxWidth: 680, padding: "24px 16px 132px" }}>
        {/* FORM */}
        <div className="min-w-0 flex-1">
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">출력 설정</div>
            <div className="mt-1 text-sm text-muted">4단계 · 마지막이에요. 출력 형식을 확정하면 1회차를 생성해요.</div>
          </div>

          {/* 시점 */}
          <div className="pw-card mb-4 p-6">
            <Label required>화자 시점 (POV)</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {POV_OPTS.map((v) => <RadioPill key={v} selected={pov === v} onClick={() => setPov(v)}>{v}</RadioPill>)}
            </div>
          </div>

          {/* 회차 설정 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-4 text-sm font-bold text-ink">회차 설정</div>

            {/* 총 회차 수 (hybrid) */}
            <div className="mb-[18px]">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5"><span className="pw-field-label">총 회차 수</span><span className="text-[13px] font-bold text-brand">*</span></span>
                <button onClick={() => setCount((c) => ({ ...c, custom: !c.custom }))} className="pw-link text-xs">{count.custom ? "목록에서 선택" : "+ 직접입력"}</button>
              </div>
              {count.custom ? (
                <div className="relative">
                  <input value={count.text} onChange={(e) => setCount((c) => ({ ...c, text: e.target.value.replace(/[^0-9]/g, "") }))} inputMode="numeric" placeholder="직접 입력" className="pw-input pr-12 text-[15px]" />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted">화</span>
                </div>
              ) : (
                <div className="pw-select-wrap">
                  <select value={count.value} onChange={(e) => setCount((c) => ({ ...c, value: e.target.value }))} className="pw-select text-[15px]">
                    {COUNT_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className="pw-select-caret">▼</span>
                </div>
              )}
            </div>

            {/* 분량 */}
            <div className="mb-[18px]">
              <div className="mb-2 pw-field-label">회차당 분량</div>
              <div className="pw-select-wrap">
                <select value={length} onChange={(e) => setLength(e.target.value)} className="pw-select text-[15px]">
                  {LENGTH_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <span className="pw-select-caret">▼</span>
              </div>
            </div>

            {/* 생성 단위 */}
            <div>
              <div className="mb-2 pw-field-label">생성 단위</div>
              <div className="flex gap-2">
                {UNIT_OPTS.map((u) => <RadioPill key={u.k} selected={unit === u.k} onClick={() => setUnit(u.k)}>{u.l}</RadioPill>)}
              </div>
            </div>
          </div>

          {/* 연령 등급 */}
          <div className="pw-card mb-4 p-6">
            <Label required>연령 등급</Label>
            <div className="mt-3 flex gap-2">
              {RATING_DEFS.map((r) => {
                const on = rating === r.k;
                return <button key={r.k} onClick={() => setRating(r.k)} className={"h-[46px] flex-1 rounded border text-sm font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}>{r.l}</button>;
              })}
            </div>
            {rating === "19" && (
              <div className="mt-3.5 flex items-start gap-[9px] rounded-lg bg-error-wash px-3.5 py-3" style={{ animation: "pw-fill .2s ease" }}>
                <span className="text-[15px] font-bold leading-tight text-error">!</span>
                <span className="text-[13px] font-bold leading-[1.5] text-[#c0504e]">19세 등급은 본인 성인 인증이 연계되며, 성인 인증된 독자에게만 노출돼요.</span>
              </div>
            )}
          </div>

          {/* 제목 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-sm font-bold text-ink">작품 제목</span>
              {titleLoading ? (
                <span className="inline-flex h-9 items-center gap-[7px] text-[13px] font-bold text-brand"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wash-2 border-t-brand" />제목 짓는 중...</span>
              ) : (
                <button onClick={aiTitle} className="pw-btn-slight h-9 px-[13px] text-[13px]">✦ AI 추천</button>
              )}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하거나 AI 추천을 받아보세요" className="pw-input text-[15px]" />
            {candidates.length > 0 ? (
              <div className="mt-3" style={{ animation: "pw-fill .2s ease" }}>
                <div className="mb-2 text-xs font-bold text-muted">AI 추천 제목 · 눌러서 선택</div>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((t) => (
                    <button key={t} onClick={() => setTitle(t)} className={"h-9 rounded-full px-3.5 text-[13px] font-bold transition " + (title === t ? "bg-brand text-white" : "bg-wash text-brand")}>{t}</button>
                  ))}
                </div>
              </div>
            ) : !title.trim() ? (
              <div className="mt-2 text-xs text-muted">미입력 시 생성 후 자동으로 제목이 부여돼요.</div>
            ) : null}
          </div>

          {/* 고급 설정 (접힘) */}
          <div className="pw-card mb-4 overflow-hidden">
            <button onClick={() => setAdvancedOpen((o) => !o)} className="flex w-full items-center justify-between border-none bg-transparent px-6 py-[18px] text-left">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-ink">고급 설정</span>
                <span className="text-[13px] text-muted">문체·톤, 표지 스타일, 키워드 (선택)</span>
              </span>
              <span className="text-base text-muted transition-transform" style={{ transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {advancedOpen && (
              <div className="px-6 pb-6 pt-1" style={{ animation: "pw-fill .2s ease" }}>
                <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                  <div>
                    <div className="mb-2 pw-field-label">문체·톤</div>
                    <div className="pw-select-wrap">
                      <select value={tone} onChange={(e) => setTone(e.target.value)} className="pw-select text-[15px]">{TONE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                      <span className="pw-select-caret">▼</span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 pw-field-label">표지 스타일</div>
                    <div className="pw-select-wrap">
                      <select value={cover} onChange={(e) => setCover(e.target.value)} className="pw-select text-[15px]">{COVER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                      <span className="pw-select-caret">▼</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5">
                  <div className="mb-2 pw-field-label">키워드·클리셰</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {keywords.map((k) => (
                      <span key={k} className="inline-flex h-[34px] items-center gap-[7px] rounded-full bg-wash pl-[13px] pr-2 text-sm font-bold text-brand">
                        {k}
                        <button onClick={() => setKeywords((ks) => ks.filter((x) => x !== k))} className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-brand/[0.18] text-xs leading-none text-brand hover:bg-brand hover:text-white">×</button>
                      </span>
                    ))}
                    <input value={keywordText} onChange={(e) => setKeywordText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} placeholder="입력 후 Enter" className="h-[34px] min-w-[140px] flex-1 rounded-full border border-hairline px-3 text-[13px] text-ink outline-none focus:border-brand" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <button onClick={() => showToast("③관계도로 돌아갑니다")} className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">← 이전: 관계도</button>
              <div className="flex items-center gap-3.5">
                {!valid && <span className="text-[13px] font-bold text-muted">필수 항목(*)을 채우면 생성할 수 있어요.</span>}
                <button disabled={!valid} onClick={() => showToast("✦ 1회차 생성을 시작합니다")} className={(valid ? "pw-btn-primary shadow-cta" : "pw-btn-disabled") + " h-14 gap-2 px-[30px] text-lg"}>✦ 1회차 생성하기</button>
              </div>
            </div>
          )}
        </div>

        {/* SIDE 전체 미리보기 */}
        {isDesktop && (
          <div className="sticky top-[88px] w-[336px] flex-shrink-0">
            <div className="pw-card p-[22px]">
              <div className="mb-1 flex items-center gap-[7px]">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
                <span className="text-base font-bold text-ink">전체 설정 미리보기</span>
              </div>
              <div className="mb-[18px] text-[13px] text-muted">생성 전, ①~④ 설정을 한눈에 확인해요.</div>
              <div className="flex flex-col">
                {summaryRows.map((r) => (
                  <div key={r.label} className="flex items-start justify-between gap-3 border-b border-[#f4f4f4] py-[11px] last:border-b-0">
                    <span className="flex-shrink-0 text-xs font-bold text-muted">{r.label}</span>
                    <span className={"text-right text-[13px] font-bold " + (r.tone === "muted" ? "text-[#b4b4b4]" : r.tone === "brand" ? "text-brand" : r.tone === "error" ? "text-error" : "text-ink")}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 rounded-lg bg-wash px-3.5 py-3 text-xs font-bold leading-[1.5] text-[#7a6ab0]">설정은 생성 후에도 회차별로 수정·재생성할 수 있어요.</div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          {!valid && <div className="mb-2 text-center text-xs font-bold text-muted">필수 항목(*)을 채워주세요</div>}
          <div className="flex gap-2.5">
            <button onClick={() => showToast("③관계도로 돌아갑니다")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
            <button disabled={!valid} onClick={() => showToast("✦ 1회차 생성을 시작합니다")} className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] flex-1 text-base"}>✦ 1회차 생성하기</button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-bold text-ink">{children}</span>
      {required && <span className="text-sm font-bold text-brand">*</span>}
    </div>
  );
}
