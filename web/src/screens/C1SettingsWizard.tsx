import { useRef, useState } from "react";
import { WizardChrome } from "../components/WizardChrome";
import { HybridSelect } from "../components/HybridSelect";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

/* ── 옵션 데이터 (02·03) ─────────────────────────────────────────────── */
const ERA_OPTIONS = ["중세 유럽", "동양 무협", "조선시대", "현대 도시", "근미래 SF", "이세계 판타지"];
const GENRE_POOL = ["환생", "빙의", "로맨스판타지", "무협", "헌터"];
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

/* ── 타입 ────────────────────────────────────────────────────────────── */
type Character = {
  id: number;
  name: string;
  gender: string;
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
  id, name: "", gender: "", birth: "", birthUnknown: true,
  appearance: "", appearanceCustom: false, body: "", bodyCustom: false,
  personality: "", personalityCustom: false, protagonist: false,
});

export default function C1SettingsWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { toast, showToast } = useToast();
  const uid = useRef(2);

  const [era, setEra] = useState({ value: "중세 유럽", custom: false, text: "" });
  const [genres, setGenres] = useState<string[]>(["회귀", "복수"]);
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [genreCustomText, setGenreCustomText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiTimer = useRef<number | undefined>(undefined);
  const [characters, setCharacters] = useState<Character[]>([
    { ...newChar(1), name: "카엘", gender: "남성", birthUnknown: true, appearance: "은발 장신", body: "왼눈 흉터", personality: "냉철", protagonist: true },
    { ...newChar(2), name: "리나", gender: "여성", birth: "1187-05-12", birthUnknown: false, appearance: "붉은 머리", body: "화상 흉터", personality: "활달", protagonist: false },
  ]);

  /* ── 액션 ──────────────────────────────────────────────────────────── */
  const updateChar = (id: number, patch: Partial<Character>) =>
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const setProtagonist = (id: number, val: boolean) =>
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, protagonist: val } : val ? { ...c, protagonist: false } : c)));
  const addChar = () => setCharacters((cs) => [...cs, newChar(++uid.current)]);
  const removeChar = (id: number) => setCharacters((cs) => cs.filter((c) => c.id !== id));

  const removeGenre = (g: string) => setGenres((gs) => gs.filter((x) => x !== g));
  const addGenre = (g: string) => {
    setGenres((gs) => (gs.includes(g) ? gs : [...gs, g]));
    setGenrePickerOpen(false);
  };
  const addCustomGenre = () => {
    const t = genreCustomText.trim();
    if (!t || genres.includes(t)) return setGenreCustomText("");
    setGenres((gs) => [...gs, t]);
    setGenreCustomText("");
    setGenrePickerOpen(false);
  };

  const aiAutofill = () => {
    setAiLoading(true);
    setGenrePickerOpen(false);
    aiTimer.current = window.setTimeout(() => {
      setEra({ value: "중세 유럽", custom: false, text: "" });
      setGenres(["회귀", "복수"]);
      setCharacters([
        { ...newChar(++uid.current), name: "카엘", gender: "남성", birthUnknown: true, appearance: "은발 장신", body: "왼눈 흉터", personality: "냉철", protagonist: true },
        { ...newChar(++uid.current), name: "리나", gender: "여성", birth: "1187-05-12", birthUnknown: false, appearance: "붉은 머리", body: "화상 흉터", personality: "활달", protagonist: false },
      ]);
      setAiLoading(false);
      showToast("AI가 추천 설정을 채웠어요");
    }, 1300);
  };

  /* ── 검증 ──────────────────────────────────────────────────────────── */
  const eraFilled = era.custom ? !!era.text.trim() : !!era.value;
  const genreFilled = genres.length > 0;
  const charsFilled = characters.length > 0 && characters.every((c) => c.name.trim());
  const valid = eraFilled && genreFilled && charsFilled;

  const availGenres = GENRE_POOL.filter((o) => !genres.includes(o));
  const summaryEra = era.custom ? era.text.trim() || "미입력" : era.value || "미선택";

  const showSide = isDesktop;

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome current={1} isMobile={isMobile} onBack={() => showToast("이전 화면으로 돌아갑니다")} onSaveDraft={() => showToast("임시저장됨")} />

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
            <div className="mt-1 text-sm text-muted">1단계 · 작품의 토대를 잡아요. 추천값이 채워져 있으니 그대로 써도 좋아요.</div>
          </div>

          {/* AI assist */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-wash-border bg-wash px-[18px] py-4">
            <div className="min-w-[200px]">
              <div className="text-[15px] font-bold text-ink">막막하다면, AI에게 맡겨보세요</div>
              <div className="mt-[3px] text-[13px] text-ink2">추천 설정을 한 번에 채워드려요. 언제든 수정할 수 있어요.</div>
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

          {/* CARD: 시대 + 장르 */}
          <div className="pw-card mb-4 p-6">
            {/* 배경 시대 */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-bold text-ink">배경 시대</span>
                <span className="text-sm font-bold text-brand">*</span>
              </div>
              {era.custom ? (
                <input
                  value={era.text}
                  onChange={(e) => setEra((s) => ({ ...s, text: e.target.value }))}
                  placeholder="배경 시대를 직접 입력하세요"
                  className={"pw-input" + (eraFilled ? "" : " pw-input--err")}
                />
              ) : (
                <div className="pw-select-wrap">
                  <select
                    value={era.value}
                    onChange={(e) => setEra((s) => ({ ...s, value: e.target.value }))}
                    className={"pw-select" + (eraFilled ? "" : " pw-input--err")}
                  >
                    {ERA_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <span className="pw-select-caret">▼</span>
                </div>
              )}
              <div className="mt-2">
                <button onClick={() => setEra((s) => ({ ...s, custom: !s.custom }))} className="pw-link">
                  {era.custom ? "목록에서 선택" : "+ 직접입력"}
                </button>
              </div>
            </div>

            {/* 장르 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-bold text-ink">장르</span>
                <span className="text-sm font-bold text-brand">*</span>
                <span className="text-[13px] font-normal text-muted">복수 선택 가능</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {genres.map((g) => (
                  <span key={g} className="inline-flex h-[34px] items-center gap-[7px] rounded-full bg-wash pl-[13px] pr-2 text-sm font-bold text-brand">
                    {g}
                    <button
                      onClick={() => removeGenre(g)}
                      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-brand/[0.18] text-xs leading-none text-brand hover:bg-brand hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setGenrePickerOpen((o) => !o)}
                    className="h-[34px] rounded-full border border-dashed border-[#b6a9ff] bg-transparent px-3.5 text-sm font-bold text-brand transition hover:bg-wash"
                  >
                    + 추가
                  </button>
                  {genrePickerOpen && (
                    <div className="absolute left-0 top-[42px] z-30 w-52 rounded-lg border border-hairline bg-white p-1.5 shadow-pop">
                      {availGenres.map((o) => (
                        <button
                          key={o}
                          onClick={() => addGenre(o)}
                          className="block w-full rounded px-2.5 py-2 text-left text-sm font-bold text-ink transition hover:bg-canvas"
                        >
                          {o}
                        </button>
                      ))}
                      <div className="mx-1 my-1.5 h-px bg-hairline" />
                      <div className="flex gap-1.5 px-1 pb-1 pt-0.5">
                        <input
                          value={genreCustomText}
                          onChange={(e) => setGenreCustomText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCustomGenre()}
                          placeholder="직접 입력"
                          className="h-9 min-w-0 flex-1 rounded border border-hairline px-2.5 text-[13px] text-ink outline-none focus:border-brand"
                        />
                        <button onClick={addCustomGenre} className="pw-btn-primary h-9 whitespace-nowrap px-3 text-[13px]">
                          추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {!genreFilled && <div className="mt-2 text-[13px] font-bold text-error">장르를 1개 이상 선택해 주세요.</div>}
            </div>
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

          {/* DESKTOP next */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-end gap-3.5">
              {!valid && <span className="text-[13px] font-bold text-muted">필수 항목(*)을 채우면 다음으로 넘어갈 수 있어요.</span>}
              <button
                disabled={!valid}
                onClick={() => showToast("②서사설정 단계로 이동합니다")}
                className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-14 px-7 text-lg"}
              >
                다음: 서사설정 →
              </button>
            </div>
          )}
        </div>

        {/* ── SIDE 미리보기 ── */}
        {showSide && (
          <div className="sticky top-[88px] w-[336px] flex-shrink-0">
            <div className="pw-card p-[22px]">
              <div className="mb-1 flex items-center gap-[7px]">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
                <span className="text-base font-bold text-ink">설정 미리보기</span>
              </div>
              <div className="mb-[18px] text-[13px] text-muted">입력하는 내용이 여기에 모여요.</div>

              <Preview label="배경 시대">
                <div className="text-[15px] font-bold text-ink">{summaryEra}</div>
              </Preview>
              <Divider />
              <Preview label={`장르 · ${genres.length}`}>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g} className="inline-flex h-7 items-center rounded-full bg-wash px-[11px] text-[13px] font-bold text-brand">{g}</span>
                  ))}
                </div>
              </Preview>
              <Divider />
              <Preview label={`등장인물 · ${characters.length}`}>
                <div className="flex flex-col gap-2">
                  {characters.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-hairline px-3 py-2.5">
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
                  ))}
                </div>
              </Preview>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          {!valid && <div className="mb-2 text-center text-xs font-bold text-muted">필수 항목(*)을 채워주세요</div>}
          <button
            disabled={!valid}
            onClick={() => showToast("②서사설정 단계로 이동합니다")}
            className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] w-full text-[17px]"}
          >
            다음: 서사설정 →
          </button>
        </div>
      )}

      <Toast message={toast} />
    </div>
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

/* ── 작은 조각들 ───────────────────────────────────────────────────────── */
export function RadioPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition " +
        (selected ? "border border-brand bg-wash text-brand" : "border border-line2 bg-white text-ink2")
      }
    >
      <span
        className="box-border h-4 w-4 rounded-full transition-all"
        style={{ border: selected ? "5px solid #816bff" : "2px solid #c4c4c4" }}
      />
      {children}
    </button>
  );
}

function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-bold text-muted">{label}</div>
      {children}
    </div>
  );
}
function Divider() {
  return <div className="my-4 h-px bg-hairline" />;
}
