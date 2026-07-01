import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";
import { suggestNarrative, updateNovel } from "@/lib/api";

type Hybrid = { value: string; custom: boolean; text: string };
const hybridVal = (f: Hybrid) => (f.custom ? f.text.trim() : f.value);

const GOAL_OPTS = ["복수", "생존", "신분 상승", "사랑 쟁취", "세계 구원", "가족 보호", "최강이 되기", "진실 규명"];
const CONFLICT_OPTS = ["인물 대 인물", "인물 대 사회", "인물 대 운명", "인물 대 자아", "인물 대 자연·재난"];
const ENDING_OPTS = ["해피엔딩", "새드엔딩", "열린 결말", "반전 결말", "복수 완성", "회귀·환생 성공"];

const STAGE_META = [
  { key: "ki", badge: "발단", kor: "기", placeholder: "인물과 배경, 사건의 씨앗을 소개해요." },
  { key: "seung", badge: "전개", kor: "승", placeholder: "갈등이 점차 깊어지고 사건이 얽혀요." },
  { key: "jeon", badge: "위기", kor: "전", placeholder: "갈등이 최고조에 달하는 전환점이에요." },
  { key: "gyeol", badge: "절정·결말", kor: "결", placeholder: "갈등이 해소되고 이야기가 마무리돼요." },
] as const;
type StageKey = (typeof STAGE_META)[number]["key"];


export default function CNarrativeWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { saveNarrative, data: wizData } = useWizard();

  const [goal, setGoal] = useState<Hybrid>(() => {
    if (!wizData.goal) return { value: "", custom: false, text: "" };
    return GOAL_OPTS.includes(wizData.goal) ? { value: wizData.goal, custom: false, text: "" } : { value: "", custom: true, text: wizData.goal };
  });
  const [conflict, setConflict] = useState<Hybrid>(() => {
    if (!wizData.conflict) return { value: "", custom: false, text: "" };
    return CONFLICT_OPTS.includes(wizData.conflict) ? { value: wizData.conflict, custom: false, text: "" } : { value: "", custom: true, text: wizData.conflict };
  });
  const [ending, setEnding] = useState<Hybrid>(() => {
    if (!wizData.ending) return { value: "", custom: false, text: "" };
    return ENDING_OPTS.includes(wizData.ending) ? { value: wizData.ending, custom: false, text: "" } : { value: "", custom: true, text: wizData.ending };
  });
  const [synopsis, setSynopsis] = useState("");
  const [stages, setStages] = useState<Record<StageKey, string>>(() => ({
    ki: wizData.storyFlow["발단"] || "",
    seung: wizData.storyFlow["전개"] || "",
    jeon: wizData.storyFlow["위기"] || "",
    gyeol: wizData.storyFlow["절정"] || "",
  }));
  const [aiLoading, setAiLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // 감정 목표 & 레퍼런스
  const [emotionalGoal, setEmotionalGoal] = useState(wizData.emotionalGoal ?? "");
  const [referenceWork, setReferenceWork] = useState(wizData.referenceWork ?? "");
  const [cliffhangerStyle, setCliffhangerStyle] = useState(wizData.cliffhangerStyle ?? "");

  // 복선 계획
  const fsId = useRef(0);
  const [foreshadowing, setForeshadowing] = useState<{ id: number; hint: string; revealChapter: string }[]>(
    () => (wizData.foreshadowing ?? []).map((f) => ({ id: ++fsId.current, hint: f.hint, revealChapter: String(f.revealChapter) }))
  );
  const addFs = () => setForeshadowing((s) => [...s, { id: ++fsId.current, hint: "", revealChapter: "" }]);
  const patchFs = (id: number, patch: { hint?: string; revealChapter?: string }) =>
    setForeshadowing((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFs = (id: number) => setForeshadowing((s) => s.filter((f) => f.id !== id));

  // 회차 패턴
  const [chapterRhythm, setChapterRhythm] = useState({
    eventEveryN: wizData.chapterRhythm?.eventEveryN ?? "",
    maxOpenThreads: wizData.chapterRhythm?.maxOpenThreads ?? "",
    note: wizData.chapterRhythm?.note ?? "",
  });
  const patchRhythm = (patch: Partial<typeof chapterRhythm>) => setChapterRhythm((s) => ({ ...s, ...patch }));

  const goalV = hybridVal(goal), conflictV = hybridVal(conflict), endingV = hybridVal(ending);
  const stagesFilled = STAGE_META.every((m) => stages[m.key].trim());
  const valid = !!goalV && !!conflictV && !!endingV && stagesFilled;

  const collectNarrative = () => ({
    goal: goalV,
    conflict: conflictV,
    storyFlow: { 발단: stages.ki, 전개: stages.seung, 위기: stages.jeon, 절정: stages.gyeol },
    ending: endingV,
    emotionalGoal,
    referenceWork,
    cliffhangerStyle,
    foreshadowing: foreshadowing.filter(f => f.hint.trim()).map(f => ({ hint: f.hint.trim(), revealChapter: parseInt(f.revealChapter) || 0 })),
    chapterRhythm: { eventEveryN: chapterRhythm.eventEveryN, maxOpenThreads: chapterRhythm.maxOpenThreads, note: chapterRhythm.note },
  });

  const goNext = async () => {
    const patch = collectNarrative();
    saveNarrative(patch);
    if (wizData.editingNovelId) {
      setSavingEdit(true);
      try {
        await updateNovel(wizData.editingNovelId, { settings: { ...wizData, ...patch } });
      } catch {
        showToast("저장에 실패했어요");
        setSavingEdit(false);
        return;
      }
      setSavingEdit(false);
    }
    navigate("/create/output");
  };

  const aiSuggest = async () => {
    setAiLoading(true);
    try {
      const res = await suggestNarrative({
        era: wizData.era,
        genres: wizData.genres,
        goal: hybridVal(goal),
        conflict: hybridVal(conflict),
        ending: hybridVal(ending),
        emotionalGoal: emotionalGoal || undefined,
        referenceWork: referenceWork || undefined,
        synopsis: synopsis || undefined,
        characters: wizData.characters.map(c => ({ name: c.name, role: c.role, personality: c.personality })),
        worldRules: wizData.worldRules,
        relationships: wizData.relationships.map(r => ({
          fromChar: r.fromChar,
          toChar: r.toChar,
          relation: r.relation ?? "",
        })),
        foreshadowing: foreshadowing.filter(f => f.hint.trim()).map(f => ({ hint: f.hint.trim(), revealChapter: parseInt(f.revealChapter) || 0 })),
        chapterRhythm,
      });
      setStages({ ki: res.ki, seung: res.seung, jeon: res.jeon, gyeol: res.gyeol });
      showToast("AI가 4단 구조를 제안했어요");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "AI 생성 실패");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>

      <div className="mx-auto box-border w-full" style={isDesktop ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" } : { maxWidth: 680, padding: "24px 16px 132px" }}>
        {/* FORM */}
        <div className="min-w-0 flex-1">
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">서사 설정</div>
            <div className="mt-1 text-sm text-muted">목표·결말·복선을 모두 채운 뒤 AI가 기승전결을 완성해요.</div>
          </div>

          {/* 목표 + 갈등 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-6">
              <HybridSelect label="주인공 목표·동기" required error={!goalV} custom={goal.custom} onToggleCustom={() => setGoal((f) => ({ ...f, custom: !f.custom }))} value={goal.custom ? goal.text : goal.value} onChange={(v) => setGoal((f) => (f.custom ? { ...f, text: v } : { ...f, value: v }))} customPlaceholder="예: 잃어버린 기억을 되찾기" height={48}>
                <option value="">선택</option>
                {GOAL_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </HybridSelect>
            </div>
            <HybridSelect label="핵심 갈등" required error={!conflictV} custom={conflict.custom} onToggleCustom={() => setConflict((f) => ({ ...f, custom: !f.custom }))} value={conflict.custom ? conflict.text : conflict.value} onChange={(v) => setConflict((f) => (f.custom ? { ...f, text: v } : { ...f, value: v }))} customPlaceholder="예: 인물 대 인공지능" height={48}>
              <option value="">선택</option>
              {CONFLICT_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </HybridSelect>
          </div>

          {/* 결말 방향 */}
          <div className="pw-card mb-4 p-6">
            <HybridSelect label="결말 방향" required error={!endingV} custom={ending.custom} onToggleCustom={() => setEnding((f) => ({ ...f, custom: !f.custom }))} value={ending.custom ? ending.text : ending.value} onChange={(v) => setEnding((f) => (f.custom ? { ...f, text: v } : { ...f, value: v }))} customPlaceholder="예: 주인공의 희생으로 세계가 재건된다" height={48}>
              <option value="">선택</option>
              {ENDING_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </HybridSelect>
          </div>

          {/* 감정 목표 & 레퍼런스 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 text-sm font-bold text-ink">감정 목표 & 레퍼런스 <span className="text-[13px] font-normal text-muted">선택</span></div>
            <div className="mb-4 text-[13px] text-muted">독자가 느끼길 바라는 감정과 참고할 작품 분위기를 기록해 두면 회차마다 일관된 톤이 유지돼요.</div>

            <div className="mb-4">
              <div className="mb-2 pw-field-label">독자 감정 목표</div>
              <div className="flex flex-wrap gap-2">
                {["통쾌함", "설렘", "슬픔", "공포", "긴장감", "감동"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEmotionalGoal((v) => (v === opt ? "" : opt))}
                    className={"h-9 rounded-full border px-4 text-sm font-bold transition " + (emotionalGoal === opt ? "border-brand bg-brand text-white" : "border-line2 text-ink2 hover:border-brand hover:text-brand")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 pw-field-label">참고 작품·분위기</div>
              <input
                value={referenceWork}
                onChange={(e) => setReferenceWork(e.target.value)}
                placeholder='예: "전지적 독자 시점" 같은 묵직한 서사, 나루토 성장 서사'
                className="pw-input text-[15px]"
              />
            </div>

            <div>
              <div className="mb-2 pw-field-label">클리프행어 스타일</div>
              <div className="flex flex-wrap gap-2">
                {["반전형", "의문형", "감정형", "행동형"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCliffhangerStyle((v) => (v === opt ? "" : opt))}
                    className={"h-9 rounded-full border px-4 text-sm font-bold transition " + (cliffhangerStyle === opt ? "border-brand bg-brand text-white" : "border-line2 text-ink2 hover:border-brand hover:text-brand")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 복선 계획표 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-sm font-bold text-ink">복선 계획표 <span className="text-[13px] font-normal text-muted">선택</span></div>
              <button type="button" onClick={addFs} className="pw-btn-slight h-[34px] px-3 text-[13px]">+ 복선 추가</button>
            </div>
            <div className="mb-3 text-[13px] text-muted">심어야 할 복선과 회수 예정 회차를 적어두면 AI가 해당 회차 전에 복선을 자연스럽게 심어요.</div>

            {foreshadowing.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line2 p-4 text-center text-[13px] text-muted">복선이 없어요. 추가 버튼으로 복선을 계획해 보세요.</div>
            ) : (
              <div className="space-y-2.5">
                {foreshadowing.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2.5">
                    <span className="w-5 flex-shrink-0 text-center text-[13px] font-bold text-muted">{i + 1}</span>
                    <input
                      value={f.hint}
                      onChange={(e) => patchFs(f.id, { hint: e.target.value })}
                      placeholder='예: 주인공의 왼쪽 눈이 가끔 떨린다'
                      className="h-11 min-w-0 flex-1 rounded border border-hairline px-3 text-[15px] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                    />
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <input
                        type="number"
                        value={f.revealChapter}
                        onChange={(e) => patchFs(f.id, { revealChapter: e.target.value })}
                        min={1}
                        placeholder="회차"
                        className="h-11 w-[72px] rounded border border-hairline px-2.5 text-center text-[15px] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                      />
                      <span className="text-[13px] text-muted">화</span>
                    </div>
                    <button type="button" onClick={() => removeFs(f.id)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-muted transition hover:bg-error-wash hover:text-error">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 회차 패턴·리듬 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 text-sm font-bold text-ink">회차 패턴·리듬 <span className="text-[13px] font-normal text-muted">선택</span></div>
            <div className="mb-4 text-[13px] text-muted">사건 밀도와 동시 열린 복선 수를 제한해 회차마다 일정한 속도감을 유지해요.</div>

            <div className="grid gap-4" style={{ gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr" }}>
              <div>
                <div className="mb-1.5 pw-field-label">이벤트 주기 <span className="font-normal text-muted">(매 N화마다 큰 사건)</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-muted">매</span>
                  <input
                    type="number"
                    value={chapterRhythm.eventEveryN}
                    onChange={(e) => patchRhythm({ eventEveryN: e.target.value })}
                    min={1}
                    placeholder="5"
                    className="h-11 w-[72px] rounded border border-hairline px-2.5 text-center text-[15px] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                  />
                  <span className="text-[14px] text-muted">화마다 큰 사건</span>
                </div>
              </div>
              <div>
                <div className="mb-1.5 pw-field-label">동시 열린 복선 최대</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={chapterRhythm.maxOpenThreads}
                    onChange={(e) => patchRhythm({ maxOpenThreads: e.target.value })}
                    min={1}
                    placeholder="3"
                    className="h-11 w-[72px] rounded border border-hairline px-2.5 text-center text-[15px] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                  />
                  <span className="text-[14px] text-muted">개 이내</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 pw-field-label">기타 메모</div>
              <input
                value={chapterRhythm.note}
                onChange={(e) => patchRhythm({ note: e.target.value })}
                placeholder='예: 홀수 회차는 액션, 짝수 회차는 감정 회수로 교차 배치'
                className="pw-input text-[15px]"
              />
            </div>
          </div>

          {/* 기승전결 — 위 항목 모두 채운 뒤 AI 자동생성 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-sm font-bold text-ink">스토리 큰 흐름 (기승전결)</span>
              <span className="text-sm font-bold text-brand">*</span>
            </div>
            <div className="mb-3.5 text-[13px] text-muted">위 항목을 다 채웠다면 AI 자동생성으로 기승전결을 완성하세요. 직접 작성해도 좋아요.</div>

            {/* AI 자동생성 */}
            <div className="mb-[18px] rounded-lg border border-wash-border bg-wash p-4">
              <div className="mb-2 text-[13px] font-bold text-ink">한 줄 시놉시스 <span className="font-normal text-muted">(선택 — 없으면 위 설정을 참고해요)</span></div>
              <div className="flex flex-wrap gap-2.5">
                <input value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="예: 처형당한 검사가 10년 전으로 회귀해 복수한다" className="h-[46px] min-w-[200px] flex-1 rounded border border-wash-2 bg-white px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:shadow-focus" />
                {aiLoading ? (
                  <button disabled className="pw-btn-primary h-[46px] whitespace-nowrap px-[18px] text-sm opacity-90" style={{ cursor: "default" }}>
                    <span className="inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/40 border-t-white" />구상 중...
                  </button>
                ) : (
                  <button onClick={aiSuggest} className="pw-btn-primary h-[46px] whitespace-nowrap px-[18px] text-sm">✦ AI가 4단 구조 제안</button>
                )}
              </div>
            </div>

            {/* 4 stages */}
            <div className="flex flex-col gap-3.5">
              {STAGE_META.map((m) => {
                const v = stages[m.key];
                const err = !v.trim();
                return (
                  <div key={m.key} className="flex items-start gap-3">
                    <div className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5 pt-0.5">
                      <span className="w-full rounded bg-wash py-[5px] text-center text-[11px] font-bold text-brand">{m.badge}</span>
                      <span className="text-xs font-bold text-muted">{m.kor}</span>
                    </div>
                    <textarea value={v} onChange={(e) => setStages((s) => ({ ...s, [m.key]: e.target.value }))} placeholder={m.placeholder} className={"min-h-[72px] min-w-0 flex-1 resize-y rounded border bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink outline-none transition focus:border-brand focus:shadow-focus " + (err ? "border-error shadow-focus-error" : "border-hairline")} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <button onClick={() => navigate("/create/relations")} className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">← 이전: 관계도</button>
              <div className="flex items-center gap-3.5">
                {!valid && <span className="text-[13px] font-bold text-muted">필수 항목(*)을 채우면 다음으로 넘어갈 수 있어요.</span>}
                <button disabled={!valid || savingEdit} onClick={goNext} className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-14 px-7 text-lg"}>{savingEdit ? "저장 중..." : "다음: 출력설정 →"}</button>
              </div>
            </div>
          )}
        </div>

        {/* SIDE 미리보기 */}
        {isDesktop && (
          <div className="sticky top-[88px] w-[336px] flex-shrink-0">
            <div className="pw-card p-[22px]">
              <div className="mb-1 flex items-center gap-[7px]">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
                <span className="text-base font-bold text-ink">서사 미리보기</span>
              </div>
              <div className="mb-[18px] text-[13px] text-muted">이야기의 뼈대가 여기에 모여요.</div>

              <SumRow label="주인공 목표·동기" value={goalV} />
              <Divider />
              <SumRow label="핵심 갈등" value={conflictV} />
              <Divider />
              <div className="mb-4">
                <div className="mb-2 text-xs font-bold text-muted">기승전결</div>
                <div className="flex flex-col gap-2">
                  {STAGE_META.map((m) => {
                    const v = stages[m.key].trim();
                    return (
                      <div key={m.key} className="flex items-start gap-[9px]">
                        <span className={"mt-px flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold " + (v ? "bg-brand text-white" : "bg-hairline text-muted")}>{m.kor}</span>
                        <span className={"text-[13px] leading-[1.5] " + (v ? "text-[#3a3a3a]" : "text-[#b4b4b4]")}>{v || `${m.badge} 미입력`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Divider />
              <SumRow label="결말 방향" value={endingV} />
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
            <button disabled={!valid || savingEdit} onClick={goNext} className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] flex-1 text-base"}>{savingEdit ? "저장 중..." : "다음: 출력설정 →"}</button>
          </div>
        </div>
      )}

    </>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-bold text-muted">{label}</div>
      <div className={"text-[15px] font-bold " + (value ? "text-ink" : "text-[#b4b4b4]")}>{value || "미입력"}</div>
    </div>
  );
}
function Divider() {
  return <div className="my-4 h-px bg-hairline" />;
}
