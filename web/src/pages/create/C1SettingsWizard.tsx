import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { RadioPill } from "@/components/ui/RadioPill";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

/* ── 옵션 데이터 (02·03) ─────────────────────────────────────────────── */
const APPEARANCE_OPTIONS = ["은발 장신", "붉은 머리", "흑발 단신", "금발의 미인", "평범한 인상"];
const BODY_OPTIONS = ["왼눈 흉터", "화상 흉터", "없음", "전신 문신", "의수/의족"];
const PERSONALITY_GROUPS: { label: string; items: { value: string; label: string }[] }[] = [
  {
    label: "성향",
    items: ["냉철", "활달", "다정다감", "오만함", "과묵함"].map((v) => ({ value: v, label: v })),
  },
  {
    label: "MBTI",
    items: [
      ["INTJ", "전략가"], ["INTP", "논리술사"], ["ENTJ", "통솔자"], ["ENTP", "변론가"],
      ["INFJ", "옹호자"], ["INFP", "중재자"], ["ENFJ", "선도자"], ["ENFP", "활동가"],
      ["ISTJ", "현실주의자"], ["ISFJ", "수호자"], ["ESTJ", "경영자"], ["ESFJ", "집정관"],
      ["ISTP", "장인"], ["ISFP", "모험가"], ["ESTP", "사업가"], ["ESFP", "연예인"],
    ].map(([v, d]) => ({ value: v, label: `${v} · ${d}` })),
  },
];

/* ── C0(세계관) 더미 — 실제로는 ①세계관 단계에서 정의된 값이 단일 출처로 흘러온다.
   (world_rules/glossary와 같은 출처. 비어 있으면 인물 필드는 자유 입력으로 폴백) ── */
const WORLD = {
  factions: ["화산파", "천마신교", "무림맹", "사도련", "황실"],
  ranksByFaction: {
    "화산파": ["장문인", "일대제자", "이대제자", "삼대제자", "속가제자"],
    "천마신교": ["교주", "호교법왕", "장로", "향주", "교도"],
    "무림맹": ["맹주", "부맹주", "단주", "무사"],
    "사도련": ["련주", "당주", "조장", "문도"],
    "황실": ["황제", "태자", "대신", "금군", "내관"],
  } as Record<string, string[]>,
  statuses: ["왕족", "귀족", "양민", "평민", "천민", "무인", "관리", "상인"],
};
const worldDefined = true; // ①세계관에서 정의되면 true. false면 모든 연동 필드가 자유 입력.
const ALL_RANKS = [...new Set(Object.values(WORLD.ranksByFaction).flat())];

/* ── 타입 ────────────────────────────────────────────────────────────── */
type Character = {
  id: number;
  name: string;
  gender: string;
  faction: string;        // 소속 국가·세력 (세계관 연동)
  factionCustom: boolean;
  rank: string;           // 지위/직급 (세계관 연동)
  rankCustom: boolean;
  status: string;         // 신분 (세계관 연동, 선택)
  statusCustom: boolean;
  birth: string;
  birthUnknown: boolean;
  appearance: string;
  appearanceCustom: boolean;
  body: string;
  bodyCustom: boolean;
  personality: string;
  personalityCustom: boolean;
  protagonist: boolean;
};

const newChar = (id: number): Character => ({
  id, name: "", gender: "",
  faction: "", factionCustom: false, rank: "", rankCustom: false, status: "", statusCustom: false,
  birth: "", birthUnknown: true,
  appearance: "", appearanceCustom: false, body: "", bodyCustom: false,
  personality: "", personalityCustom: false, protagonist: false,
});

export default function C1SettingsWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const uid = useRef(3);

  const [aiLoading, setAiLoading] = useState(false);
  const aiTimer = useRef<number | undefined>(undefined);
  const [characters, setCharacters] = useState<Character[]>([
    { ...newChar(1), name: "카엘", gender: "남성", faction: "화산파", rank: "일대제자", status: "무인", birthUnknown: true, appearance: "은발 장신", body: "왼눈 흉터", personality: "냉철", protagonist: true },
    { ...newChar(2), name: "리나", gender: "여성", faction: "화산파", rank: "이대제자", status: "양민", birth: "1187-05-12", birthUnknown: false, appearance: "붉은 머리", body: "화상 흉터", personality: "활달", protagonist: false },
    { ...newChar(3), name: "제로드", gender: "남성", faction: "천마신교", rank: "교주", status: "귀족", birthUnknown: true, appearance: "흑발 단신", body: "전신 문신", personality: "오만함", protagonist: false },
  ]);

  /* ── 액션 ──────────────────────────────────────────────────────────── */
  const updateChar = (id: number, patch: Partial<Character>) =>
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const setProtagonist = (id: number, val: boolean) =>
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, protagonist: val } : val ? { ...c, protagonist: false } : c)));
  const addChar = () => setCharacters((cs) => [...cs, newChar(++uid.current)]);
  const removeChar = (id: number) => setCharacters((cs) => cs.filter((c) => c.id !== id));

  const aiAutofill = () => {
    setAiLoading(true);
    aiTimer.current = window.setTimeout(() => {
      setCharacters([
        { ...newChar(++uid.current), name: "카엘", gender: "남성", faction: "화산파", rank: "일대제자", status: "무인", birthUnknown: true, appearance: "은발 장신", body: "왼눈 흉터", personality: "냉철", protagonist: true },
        { ...newChar(++uid.current), name: "리나", gender: "여성", faction: "화산파", rank: "이대제자", status: "양민", birth: "1187-05-12", birthUnknown: false, appearance: "붉은 머리", body: "화상 흉터", personality: "활달", protagonist: false },
        { ...newChar(++uid.current), name: "제로드", gender: "남성", faction: "천마신교", rank: "교주", status: "귀족", birthUnknown: true, appearance: "흑발 단신", body: "전신 문신", personality: "오만함", protagonist: false },
      ]);
      setAiLoading(false);
      showToast("AI가 세계관에 맞춘 인물을 채웠어요");
    }, 1300);
  };

  /* ── 검증 ──────────────────────────────────────────────────────────── */
  const charsFilled = characters.length > 0 && characters.every((c) => c.name.trim());
  const valid = charsFilled;

  const showSide = isDesktop;

  return (
    <>

      <div
        className="mx-auto box-border w-full"
        style={
          isDesktop
            ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" }
            : { maxWidth: 680, padding: "24px 16px 132px" }
        }
      >
        {/* ── FORM ── */}
        <div className="min-w-0 flex-1">
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">기본 설정</div>
            <div className="mt-1 text-sm text-muted">2단계 · 등장인물을 채워요. 세계관을 정의했다면 소속·지위를 목록에서 빠르게 고를 수 있어요.</div>
          </div>

          {/* AI assist */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-wash-border bg-wash px-[18px] py-4">
            <div className="min-w-[200px]">
              <div className="text-[15px] font-bold text-ink">막막하다면, AI에게 맡겨보세요</div>
              <div className="mt-[3px] text-[13px] text-ink2">세계관에 어울리는 인물을 한 번에 채워드려요. 언제든 수정할 수 있어요.</div>
            </div>
            {aiLoading ? (
              <button disabled className="pw-btn-primary h-11 px-[18px] text-[15px] opacity-90" style={{ cursor: "default" }}>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                채우는 중...
              </button>
            ) : (
              <button onClick={aiAutofill} className="pw-btn-primary h-11 whitespace-nowrap px-[18px] text-[15px]">
                ✦ AI 추천 자동채움
              </button>
            )}
          </div>

          {/* CARD: 등장인물 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-ink">등장인물</span>
                <span className="text-sm font-bold text-brand">*</span>
                <span className="text-[13px] font-bold text-muted">{characters.length}명</span>
              </div>
              <button onClick={addChar} className="pw-btn-slight h-[38px] px-3.5 text-sm">
                + 인물 추가
              </button>
            </div>
            <div className="mb-4 text-[13px] text-muted">최소 1명 이상 추가해 주세요. 주인공은 한 명만 지정할 수 있어요.</div>

            {characters.map((c, i) => (
              <CharacterCard
                key={c.id}
                ch={c}
                index={i + 1}
                canRemove={characters.length > 1}
                onChange={(patch) => updateChar(c.id, patch)}
                onSetProtagonist={(v) => setProtagonist(c.id, v)}
                onRemove={() => removeChar(c.id)}
              />
            ))}
          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <button
                onClick={() => navigate("/create/world")}
                className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand"
              >
                ← 이전: 세계관
              </button>
              <div className="flex items-center gap-3.5">
                {!valid && <span className="text-[13px] font-bold text-muted">인물 이름을 채우면 다음으로 넘어갈 수 있어요.</span>}
                <button
                  disabled={!valid}
                  onClick={() => navigate("/create/narrative")}
                  className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-14 px-7 text-lg"}
                >
                  다음: 서사설정 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDE 미리보기 ── */}
        {showSide && (
          <div className="sticky top-[88px] w-[336px] flex-shrink-0">
            <div className="pw-card p-[22px]">
              <div className="mb-1 flex items-center gap-[7px]">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
                <span className="text-base font-bold text-ink">인물 미리보기</span>
              </div>
              <div className="mb-[18px] text-[13px] text-muted">입력하는 인물이 여기에 모여요.</div>

              <div className="mb-1.5 text-xs font-bold text-muted">등장인물 · {characters.length}</div>
              <div className="flex flex-col gap-2">
                {characters.map((c) => {
                  const fac = c.faction.trim();
                  const rank = c.rank.trim();
                  return (
                    <div key={c.id} className="rounded border border-hairline px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-[7px]">
                          <span className="text-sm font-bold text-ink">{c.name.trim() || "이름 미정"}</span>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {(c.gender.trim() || "성별 미정")} · {c.birthUnknown ? "생일 미정" : c.birth || "생일 미정"}
                          </span>
                        </span>
                        <span className={"whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-bold " + (c.protagonist ? "bg-brand text-white" : "bg-[#f2f2f2] text-muted")}>
                          {c.protagonist ? "주인공" : "조연"}
                        </span>
                      </div>
                      {(fac || rank) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {fac && <span className="inline-flex h-6 items-center rounded-full bg-wash px-[9px] text-[12px] font-bold text-brand">{fac}</span>}
                          {rank && <span className="inline-flex h-6 items-center rounded-full bg-[#f2f2f2] px-[9px] text-[12px] font-bold text-ink2">{rank}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          {!valid && <div className="mb-2 text-center text-xs font-bold text-muted">인물 이름을 채워주세요</div>}
          <div className="flex gap-2.5">
            <button onClick={() => navigate("/create/world")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
            <button
              disabled={!valid}
              onClick={() => navigate("/create/narrative")}
              className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] flex-1 text-base"}
            >
              다음: 서사설정 →
            </button>
          </div>
        </div>
      )}

    </>
  );
}

/* ── 인물 카드 ─────────────────────────────────────────────────────────── */
function CharacterCard({
  ch, index, canRemove, onChange, onSetProtagonist, onRemove,
}: {
  ch: Character;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<Character>) => void;
  onSetProtagonist: (v: boolean) => void;
  onRemove: () => void;
}) {
  const nameErr = !ch.name.trim();

  // 세계관 연동 옵션: worldDefined면 목록, 아니면 빈 배열(=자유 입력 폴백).
  const factionOptions = worldDefined ? WORLD.factions : [];
  const statusOptions = worldDefined ? WORLD.statuses : [];
  // 지위/직급: 가능하면 선택한 세력 기준, 없으면 전체 직급으로 폴백.
  const rankOptions = worldDefined ? (WORLD.ranksByFaction[ch.faction] ?? ALL_RANKS) : [];
  const worldEmpty = factionOptions.length === 0;

  return (
    <div className="pw-card mb-3 p-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-bold text-muted">인물 {index}</span>
        {canRemove && (
          <button onClick={onRemove} className="rounded px-1.5 py-1 text-[13px] font-bold text-muted transition hover:bg-error-wash hover:text-error">
            × 삭제
          </button>
        )}
      </div>

      {/* 이름 / 성별 */}
      <div className="mb-3.5 grid grid-cols-[minmax(0,1fr)_150px] gap-3.5">
        <div>
          <div className="mb-1.5 pw-field-label">이름</div>
          <input value={ch.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="인물 이름" className={"pw-input" + (nameErr ? " pw-input--err" : "")} />
        </div>
        <div>
          <div className="mb-1.5 pw-field-label">성별</div>
          <div className="pw-select-wrap">
            <select value={ch.gender} onChange={(e) => onChange({ gender: e.target.value })} className="pw-select text-[15px]">
              <option value="">선택</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
              <option value="알수없음">알수없음</option>
            </select>
            <span className="pw-select-caret">▼</span>
          </div>
        </div>
      </div>

      {/* ★ 세계관 연동: 소속 · 지위 · 신분 (하이브리드) */}
      <div className="mb-3.5 rounded-lg border border-[#efecff] bg-[#faf9ff] p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center gap-[7px]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          <span className="text-[12px] font-bold text-brand">세계관 연동</span>
          {worldEmpty && (
            <span className="text-[12px] font-normal text-muted">· 세계관에서 국가·세력을 정의하면 목록으로 빨라져요. 지금은 직접 입력해도 돼요.</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          <HybridSelect label="소속 국가·세력" custom={ch.factionCustom} onToggleCustom={() => onChange({ factionCustom: !ch.factionCustom })} value={ch.faction} onChange={(v) => onChange({ faction: v })} customPlaceholder="예: 화산파">
            <option value="">선택</option>
            {factionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </HybridSelect>

          <HybridSelect label="지위/직급" custom={ch.rankCustom} onToggleCustom={() => onChange({ rankCustom: !ch.rankCustom })} value={ch.rank} onChange={(v) => onChange({ rank: v })} customPlaceholder="예: 일대제자">
            <option value="">선택</option>
            {rankOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </HybridSelect>

          <HybridSelect label="신분" custom={ch.statusCustom} onToggleCustom={() => onChange({ statusCustom: !ch.statusCustom })} value={ch.status} onChange={(v) => onChange({ status: v })} customPlaceholder="예: 양민">
            <option value="">선택</option>
            {statusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </HybridSelect>
        </div>
      </div>

      {/* 생년월일 */}
      <div className="mb-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="pw-field-label">생년월일</span>
          <button
            onClick={() => onChange({ birthUnknown: !ch.birthUnknown })}
            className={"inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-xs font-bold " + (ch.birthUnknown ? "text-brand" : "text-muted")}
          >
            <span className={"inline-flex h-4 w-4 items-center justify-center rounded text-[11px] leading-none text-white " + (ch.birthUnknown ? "border border-brand bg-brand" : "border border-line2 bg-white")}>
              {ch.birthUnknown ? "✓" : ""}
            </span>
            미정
          </button>
        </div>
        {ch.birthUnknown ? (
          <div className="flex h-12 items-center rounded border border-dashed border-[#d8d8d8] bg-[#fafafa] px-3.5 text-[15px] text-muted">미정 · 날짜를 정하지 않았어요</div>
        ) : (
          <input type="date" value={ch.birth} onChange={(e) => onChange({ birth: e.target.value })} className="pw-input text-[15px]" />
        )}
      </div>

      {/* 외형 / 신체특징 / 성격 (하이브리드) */}
      <div className="grid grid-cols-3 gap-3.5">
        <HybridSelect label="외형" custom={ch.appearanceCustom} onToggleCustom={() => onChange({ appearanceCustom: !ch.appearanceCustom })} value={ch.appearance} onChange={(v) => onChange({ appearance: v })} customPlaceholder="예: 푸른 눈동자">
          <option value="">선택</option>
          {APPEARANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </HybridSelect>

        <HybridSelect label="신체특징" custom={ch.bodyCustom} onToggleCustom={() => onChange({ bodyCustom: !ch.bodyCustom })} value={ch.body} onChange={(v) => onChange({ body: v })} customPlaceholder="예: 등의 낙인">
          <option value="">선택</option>
          {BODY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </HybridSelect>

        <HybridSelect label="성격" custom={ch.personalityCustom} onToggleCustom={() => onChange({ personalityCustom: !ch.personalityCustom })} value={ch.personality} onChange={(v) => onChange({ personality: v })} customPlaceholder="예: 외강내유">
          <option value="">선택</option>
          {PERSONALITY_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
            </optgroup>
          ))}
        </HybridSelect>
      </div>

      {/* 주인공 */}
      <div className="mt-4 flex flex-wrap items-center gap-3.5">
        <span className="pw-field-label">주인공</span>
        <RadioPill selected={ch.protagonist} onClick={() => onSetProtagonist(true)}>예</RadioPill>
        <RadioPill selected={!ch.protagonist} onClick={() => onSetProtagonist(false)}>아니오</RadioPill>
      </div>
    </div>
  );
}

