import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

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

const AI_STAGES: Record<StageKey, string> = {
  ki: "처형대에서 눈을 감은 카엘이 10년 전, 모든 것을 잃기 전으로 회귀한다. 아직 무너지지 않은 가문과 살아있는 사람들을 마주한다.",
  seung: "회귀자의 지식으로 배신자들의 음모를 하나씩 파악하며 힘을 키운다. 과거의 동료를 다시 만나지만 신뢰의 균열이 시작된다.",
  jeon: "믿었던 이의 두 번째 배신으로 계획이 무너지고, 카엘은 복수와 사람을 지키는 일 사이에서 선택을 강요받는다.",
  gyeol: "황혼이 내리기 전, 카엘은 가장 차가운 검으로 원흉을 베고 비극의 고리를 끊는다. 같은 실수는 반복되지 않는다.",
};

export default function CNarrativeWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const aiT = useRef<number | undefined>(undefined);

  const [goal, setGoal] = useState<Hybrid>({ value: "복수", custom: false, text: "" });
  const [conflict, setConflict] = useState<Hybrid>({ value: "인물 대 인물", custom: false, text: "" });
  const [ending, setEnding] = useState<Hybrid>({ value: "복수 완성", custom: false, text: "" });
  const [synopsis, setSynopsis] = useState("처형당한 검사가 10년 전으로 회귀해 복수한다");
  const [stages, setStages] = useState<Record<StageKey, string>>({ ki: "", seung: "", jeon: "", gyeol: "" });
  const [aiLoading, setAiLoading] = useState(false);

  const goalV = hybridVal(goal), conflictV = hybridVal(conflict), endingV = hybridVal(ending);
  const stagesFilled = STAGE_META.every((m) => stages[m.key].trim());
  const valid = !!goalV && !!conflictV && !!endingV && stagesFilled;

  const aiSuggest = () => {
    setAiLoading(true);
    aiT.current = window.setTimeout(() => { setStages(AI_STAGES); setAiLoading(false); showToast("AI가 4단 구조를 제안했어요"); }, 1400);
  };

  return (
    <>

      <div className="mx-auto box-border w-full" style={isDesktop ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" } : { maxWidth: 680, padding: "24px 16px 132px" }}>
        {/* FORM */}
        <div className="min-w-0 flex-1">
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">서사 설정</div>
            <div className="mt-1 text-sm text-muted">2단계 · 이야기의 뼈대를 잡아요. 한 줄만 적으면 AI가 4단 구조를 제안해요.</div>
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

          {/* 기승전결 */}
          <div className="pw-card mb-4 p-6">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-sm font-bold text-ink">스토리 큰 흐름 (기승전결)</span>
              <span className="text-sm font-bold text-brand">*</span>
            </div>
            <div className="mb-3.5 text-[13px] text-muted">한 줄 시놉시스만 적고 AI 제안을 받거나, 4단계를 직접 채워도 좋아요.</div>

            {/* AI synopsis */}
            <div className="mb-[18px] rounded-lg border border-wash-border bg-wash p-4">
              <div className="mb-2 text-[13px] font-bold text-ink">한 줄 시놉시스</div>
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

          {/* 결말 방향 */}
          <div className="pw-card mb-4 p-6">
            <HybridSelect label="결말 방향" required error={!endingV} custom={ending.custom} onToggleCustom={() => setEnding((f) => ({ ...f, custom: !f.custom }))} value={ending.custom ? ending.text : ending.value} onChange={(v) => setEnding((f) => (f.custom ? { ...f, text: v } : { ...f, value: v }))} customPlaceholder="예: 주인공의 희생으로 세계가 재건된다" height={48}>
              <option value="">선택</option>
              {ENDING_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </HybridSelect>
          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <button onClick={() => navigate("/create")} className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">← 이전: 기본설정</button>
              <div className="flex items-center gap-3.5">
                {!valid && <span className="text-[13px] font-bold text-muted">필수 항목(*)을 채우면 다음으로 넘어갈 수 있어요.</span>}
                <button disabled={!valid} onClick={() => navigate("/create/relations")} className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-14 px-7 text-lg"}>다음: 관계도 →</button>
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
            <button onClick={() => navigate("/create")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
            <button disabled={!valid} onClick={() => navigate("/create/relations")} className={(valid ? "pw-btn-primary" : "pw-btn-disabled") + " h-[54px] flex-1 text-base"}>다음: 관계도 →</button>
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
