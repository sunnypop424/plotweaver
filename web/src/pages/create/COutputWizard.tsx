import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RadioPill } from "@/components/ui/RadioPill";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";
import { createNovel, updateNovel, suggestTitle } from "@/lib/api";

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
const PARA_OPTS = [
  { v: "짧게", l: "짧게", desc: "1~3문장 · 속도감·긴장감" },
  { v: "중간", l: "중간", desc: "3~5문장 · 일반 웹소설 호흡" },
  { v: "길게", l: "길게", desc: "5~9문장 · 서정·심리 묘사" },
];

export default function COutputWizard() {
  const { isMobile, isDesktop } = useViewport();
  const navigate = useNavigate();
  const { data: wizData, saveOutput, setNovelId, clearEditMode } = useWizard();
  const editingNovelId = wizData.editingNovelId;
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const POV_NEEDS_CHAR = ["1인칭 관찰자", "3인칭 제한적"];
  const [pov, setPov] = useState(() => {
    const p = wizData.pov || "3인칭 전지적";
    return p.includes(" · ") ? p.split(" · ")[0] : p;
  });
  const [povChar, setPovChar] = useState(() => {
    const p = wizData.pov || "";
    return p.includes(" · ") ? p.split(" · ")[1] : "";
  });
  const [count, setCount] = useState(() => {
    const n = wizData.totalChapters;
    if (!n) return { value: "30화", custom: false, text: "" };
    const presetMap: Record<number, string> = { 1: "단편 (1화)", 10: "10화", 30: "30화" };
    const preset = presetMap[n];
    return preset ? { value: preset, custom: false, text: "" } : { value: "", custom: true, text: String(n) };
  });
  const [length, setLength] = useState(wizData.length || "보통 (4천자)");
  const [unit, setUnit] = useState(wizData.unit || "1회차씩");
  const [rating, setRating] = useState<string>(wizData.ageRating || "all");
  const [title, setTitle] = useState(wizData.title || "");
  const [titleLoading, setTitleLoading] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tone, setTone] = useState(wizData.tone || "간결·속도감");
  const [cover, setCover] = useState(wizData.coverStyle || "웹툰풍");
  const [paraLen, setParaLen] = useState((wizData as { paragraphLength?: string }).paragraphLength || "중간");
  const [keywords, setKeywords] = useState<string[]>(wizData.genres.length ? wizData.genres.slice(0, 3) : []);
  const [keywordText, setKeywordText] = useState("");

  const needsChar = POV_NEEDS_CHAR.includes(pov);
  const fullPov = needsChar && povChar ? `${pov} · ${povChar}` : pov;
  const countV = count.custom ? (count.text ? `${count.text}화` : "") : count.value;
  const totalChaptersNum = parseInt(countV?.replace("화", "") ?? "1") || 1;
  const valid = !!pov && !!countV && !!length && !!unit && !!rating;
  const ratingLabel = RATING_DEFS.find((r) => r.k === rating)!.l;

  const handleGenerate = async () => {
    if (!valid || submitting) return;
    const outputData = { pov: fullPov, totalChapters: totalChaptersNum, length, title: title.trim() || "무제", ageRating: rating, tone, coverStyle: cover, unit, paragraphLength: paraLen };
    saveOutput(outputData);
    setSubmitting(true);
    try {
      const settings = { ...wizData, ...outputData };
      if (editingNovelId) {
        // 편집 모드 — 기존 작품 설정 업데이트
        await updateNovel(editingNovelId, { title: outputData.title, settings });
        clearEditMode();
        navigate(`/works/${editingNovelId}`, { replace: true, state: { toast: "설정이 저장됐어요" } });
      } else {
        // 생성 모드 — 신규 작품 생성
        const novel = await createNovel(outputData.title, settings);
        setNovelId(novel.id);
        navigate("/create/generating", { state: { novelId: novel.id } });
      }
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : "작품 생성 중 오류가 발생했어요. 다시 시도해주세요."));
      setSubmitting(false);
    }
  };

  const aiTitle = async () => {
    setTitleLoading(true);
    try {
      const res = await suggestTitle({
        era: wizData.era,
        genres: wizData.genres,
        goal: wizData.goal,
        conflict: wizData.conflict,
        characters: wizData.characters,
        pov: fullPov,
        ending: wizData.ending,
      });
      setCandidates(res.titles);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "제목 추천 실패");
    } finally {
      setTitleLoading(false);
    }
  };
  const addKeyword = () => {
    const t = keywordText.trim();
    if (t && !keywords.includes(t)) setKeywords((k) => [...k, t]);
    setKeywordText("");
  };

  // 필수항목 경고 (저장은 가능하되 사용자에게 알림)
  const missingWarnings = [
    !wizData.era && "배경·시대",
    !wizData.genres.length && "장르",
    !wizData.characters.length && "등장인물",
    !wizData.goal && "주인공 목표",
    !wizData.conflict && "핵심 갈등",
  ].filter((v): v is string => !!v);

  const protagonist = wizData.characters.find((c) => c.role === "protagonist");
  const charSummary = wizData.characters.length === 0
    ? "미입력"
    : protagonist
      ? `${protagonist.name}(주인공)${wizData.characters.length > 1 ? ` 외 ${wizData.characters.length - 1}명` : ""}`
      : `${wizData.characters.length}명`;

  const summaryRows: { label: string; value: string; tone?: "muted" | "brand" | "error" }[] = [
    { label: "배경 시대", value: wizData.era || "미입력", tone: wizData.era ? undefined : "muted" },
    { label: "장르", value: wizData.genres.length ? wizData.genres.join(" · ") : "미입력", tone: wizData.genres.length ? undefined : "muted" },
    { label: "등장인물", value: charSummary, tone: wizData.characters.length === 0 ? "muted" : undefined },
    { label: "목표 · 결말", value: wizData.goal && wizData.ending ? `${wizData.goal} · ${wizData.ending}` : wizData.goal || wizData.ending || "미입력", tone: wizData.goal ? undefined : "muted" },
    { label: "시점", value: fullPov },
    { label: "회차", value: `${countV || "미정"} · ${length}`, tone: countV ? undefined : "muted" },
    { label: "생성 단위", value: unit },
    { label: "연령 등급", value: ratingLabel, tone: rating === "19" ? "error" : undefined },
    { label: "제목", value: title.trim() || "생성 후 자동 부여", tone: title.trim() ? "brand" : "muted" },
  ];

  return (
    <>

      <div className="mx-auto box-border w-full" style={isDesktop ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" } : { maxWidth: 680, padding: "24px 16px 132px" }}>
        {/* FORM */}
        <div className="min-w-0 flex-1">
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">출력 설정</div>
            <div className="mt-1 text-sm text-muted">
              {editingNovelId
                ? "5단계 · 마지막이에요. 변경된 설정을 저장하면 다음 회차부터 반영돼요."
                : "5단계 · 마지막이에요. 출력 형식을 확정하면 1회차를 생성해요."}
            </div>
          </div>

          {/* 시점 */}
          <div className="pw-card mb-4 p-6">
            <Label required>화자 시점 (POV)</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {POV_OPTS.map((v) => (
                <RadioPill key={v} selected={pov === v} onClick={() => { setPov(v); if (!POV_NEEDS_CHAR.includes(v)) setPovChar(""); }}>
                  {v}
                </RadioPill>
              ))}
            </div>

            {needsChar && (
              <div className="mt-4 border-t border-hairline pt-4" style={{ animation: "pw-fill .2s ease" }}>
                <div className="mb-[10px] text-[13px] font-bold text-ink2">
                  {pov === "1인칭 관찰자" ? "누구의 눈으로 서술할까요?" : "시점을 제한할 인물을 선택하세요"}
                </div>
                {wizData.characters.length === 0 ? (
                  <div className="text-[13px] text-muted">② 인물 설정 단계에서 인물을 추가하면 여기서 선택할 수 있어요.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {wizData.characters.map((c) => (
                      <RadioPill key={c.name} selected={povChar === c.name} onClick={() => setPovChar(c.name)}>
                        {c.name}
                        {c.role === "protagonist" && <span className="ml-1 text-[11px] text-brand/70">주인공</span>}
                      </RadioPill>
                    ))}
                  </div>
                )}
                {needsChar && !povChar && wizData.characters.length > 0 && (
                  <div className="mt-2 text-[12px] text-muted">인물을 선택하지 않으면 주인공 기준으로 생성돼요.</div>
                )}
              </div>
            )}
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
                {/* 문단 길이 */}
                <div className="mt-3.5">
                  <div className="mb-2 pw-field-label">문단 평균 길이</div>
                  <div className="flex gap-2">
                    {PARA_OPTS.map((o) => (
                      <button
                        key={o.v}
                        onClick={() => setParaLen(o.v)}
                        className={"flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-3 text-center transition " + (paraLen === o.v ? "border-brand bg-wash text-brand" : "border-hairline bg-white text-ink2 hover:border-brand/40")}
                      >
                        <span className="text-[13px] font-bold">{o.l}</span>
                        <span className="text-[11px] leading-[1.4]" style={{ color: paraLen === o.v ? "var(--color-brand)" : "#b4b4b4" }}>{o.desc}</span>
                      </button>
                    ))}
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

          {/* 필수항목 경고 */}
          {missingWarnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-[#ffe69c] bg-[#fffdf0] px-4 py-3" style={{ animation: "pw-fill .2s ease" }}>
              <div className="mb-1 text-[13px] font-bold text-[#856404]">⚠ 일부 설정이 비어있어요</div>
              <div className="text-[12px] leading-relaxed text-[#856404]">
                <span className="font-bold">{missingWarnings.join(", ")}</span>이(가) 입력되지 않았어요.<br />
                설정 없이 저장하면 AI가 임의로 생성하거나 품질이 낮을 수 있어요.
              </div>
              {editingNovelId && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missingWarnings.includes("배경·시대") || missingWarnings.includes("장르") ? (
                    <button onClick={() => navigate("/create/world")} className="rounded-full border border-[#ffe69c] bg-white px-2.5 py-1 text-[11px] font-bold text-[#856404] hover:bg-[#fff3cd]">① 세계관 설정 →</button>
                  ) : null}
                  {missingWarnings.includes("등장인물") ? (
                    <button onClick={() => navigate("/create")} className="rounded-full border border-[#ffe69c] bg-white px-2.5 py-1 text-[11px] font-bold text-[#856404] hover:bg-[#fff3cd]">② 인물 설정 →</button>
                  ) : null}
                  {(missingWarnings.includes("주인공 목표") || missingWarnings.includes("핵심 갈등")) ? (
                    <button onClick={() => navigate("/create/narrative")} className="rounded-full border border-[#ffe69c] bg-white px-2.5 py-1 text-[11px] font-bold text-[#856404] hover:bg-[#fff3cd]">④ 서사 설정 →</button>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <button onClick={() => navigate("/create/relations")} className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">← 이전: 관계도</button>
              <div className="flex items-center gap-3.5">
                {!valid && <span className="text-[13px] font-bold text-muted">필수 항목(*)을 채우면 생성할 수 있어요.</span>}
                <button disabled={!valid || submitting} onClick={handleGenerate} className={(valid && !submitting ? "pw-btn-primary shadow-cta" : "pw-btn-disabled") + " h-14 gap-2 px-[30px] text-lg"}>{submitting ? (editingNovelId ? "저장 중..." : "작품 만드는 중...") : (editingNovelId ? "✦ 설정 저장하기" : "✦ 1회차 생성하기")}</button>
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
            <button onClick={() => navigate("/create/relations")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
            <button disabled={!valid || submitting} onClick={handleGenerate} className={(valid && !submitting ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] flex-1 text-base"}>{submitting ? (editingNovelId ? "저장 중..." : "작품 만드는 중...") : (editingNovelId ? "✦ 설정 저장하기" : "✦ 1회차 생성하기")}</button>
          </div>
        </div>
      )}

    </>
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
