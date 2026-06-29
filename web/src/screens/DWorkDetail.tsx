import { useState } from "react";
import { CoverTile } from "../components/CoverTile";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

type Status = "private" | "public" | "selling";
type Grade = "user" | "assist" | "ai";
type CState = "edited" | "generated" | "generating";

const STATUS_MAP: Record<Status, { label: string; cls: string }> = {
  private: { label: "비공개", cls: "bg-[#f2f2f2] text-ink2" },
  public: { label: "무료 공개", cls: "bg-[#e8f5ee] text-[#2f8f5b]" },
  selling: { label: "판매중", cls: "bg-wash text-brand" },
};
const GRADE_MAP: Record<Grade, { label: string; cls: string }> = {
  user: { label: "AI 보조", cls: "bg-wash text-brand" },
  assist: { label: "AI 보조", cls: "bg-wash text-brand" },
  ai: { label: "AI 생성", cls: "bg-error-wash text-error" },
};
const STATE_MAP: Record<CState, { label: string; cls: string }> = {
  edited: { label: "편집됨", cls: "bg-[#e8f5ee] text-[#2f8f5b]" },
  generated: { label: "생성됨", cls: "bg-[#f2f2f2] text-muted" },
  generating: { label: "생성 중", cls: "bg-wash text-brand" },
};

const CHAPTERS: { num: number; title: string; length: string; grade: Grade; state: CState }[] = [
  { num: 1, title: "1화. 회귀", length: "4,120자", grade: "user", state: "edited" },
  { num: 2, title: "2화. 첫 번째 칼날", length: "3,980자", grade: "assist", state: "edited" },
  { num: 3, title: "3화. 배신의 밤", length: "4,310자", grade: "assist", state: "generated" },
  { num: 4, title: "4화. 옛 동료", length: "—", grade: "assist", state: "generating" },
];
const SETTING_CHIPS = [
  { label: "시대", value: "중세 유럽" }, { label: "인물", value: "카엘 외 2명" },
  { label: "목표", value: "복수" }, { label: "결말", value: "복수 완성" },
];
const STATS = [
  { label: "조회", value: "12.4만", brand: false }, { label: "구매", value: "1,840", brand: false },
  { label: "후원", value: "312", brand: false }, { label: "수익", value: "₩1.5M", brand: true },
];

export default function DWorkDetail() {
  const { vw } = useViewport();
  const { toast, showToast } = useToast();
  const isWide = vw >= 768;

  const [status, setStatus] = useState<Status>("selling");
  const [emptyMode, setEmptyMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "work" | string>(null);

  const isPrivate = status === "private";
  const isSelling = status === "selling";
  const showStats = (status === "public" || status === "selling") && !emptyMode;
  const st = STATUS_MAP[status];

  const total = 30;
  const done = emptyMode ? 0 : 12;
  const pct = Math.round((done / total) * 100);

  const more = (label: string) => () => { setMoreOpen(false); showToast(label); };
  const confirmWork = confirm === "work";

  return (
    <div className="min-h-screen bg-canvas">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-hairline bg-white px-5">
        <button onClick={() => showToast("작업실로 이동합니다 (D1)")} className="pw-btn-ghost h-[38px] flex-shrink-0 px-3 text-sm">← 작업실</button>
        <div className="min-w-0 truncate text-base font-bold">회귀한 검, 황혼을 베다</div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {isWide && (
            <>
              <button onClick={() => showToast("표지 만들기로 이동합니다 (C5)")} className="h-10 rounded border border-line2 bg-white px-3.5 text-[13px] font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">표지 만들기</button>
              <button onClick={() => showToast("판매 등록으로 이동합니다 (S2)")} className="h-10 rounded border-none bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-brand-hover">판매 등록</button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setMoreOpen((o) => !o)} className="h-10 w-10 rounded border-none bg-transparent text-lg text-muted transition hover:bg-canvas hover:text-ink2">⋯</button>
            {moreOpen && (
              <div className="absolute right-0 top-[46px] z-40 w-[184px] rounded-lg border border-hairline bg-white p-1.5 shadow-pop" style={{ animation: "pw-pop .15s ease" }}>
                <button onClick={more("작품을 복제했어요")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">복제</button>
                <button onClick={more("TXT로 내보내는 중...")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">TXT로 내보내기</button>
                <button onClick={more("PDF로 내보내는 중...")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">PDF로 내보내기</button>
                <div className="mx-1 my-1.5 h-px bg-hairline" />
                <button onClick={() => { setMoreOpen(false); setConfirm("work"); }} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-error transition hover:bg-error-wash">삭제</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-7" style={{ maxWidth: 1080 }}>
        {/* WORK HEADER */}
        <div className="mb-4 rounded-xl border border-hairline bg-white p-6">
          <div style={isWide ? { display: "flex", gap: 24, alignItems: "flex-start" } : { display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ width: isWide ? 180 : 150, flexShrink: 0 }}><CoverTile title="회귀한 검, 황혼을 베다" author="지훈" variant={0} /></div>
            <div className="min-w-0 flex-1">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className={"rounded-full px-[11px] py-1 text-[11px] font-bold " + st.cls}>{st.label}</span>
                <span className="rounded-full bg-[#f2f2f2] px-2.5 py-1 text-[11px] font-bold text-ink2">전체 이용가</span>
                <span className="rounded-full bg-wash px-2.5 py-1 text-[11px] font-bold text-brand">AI 보조</span>
              </div>
              <div className="text-[22px] font-bold leading-[1.3] tracking-[-0.5px]">회귀한 검, 황혼을 베다</div>
              <div className="mt-1.5 text-sm text-muted">회귀 · 복수 · 다크판타지</div>

              <div className="mt-4 flex flex-wrap gap-2">
                {SETTING_CHIPS.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-[#fafafa] px-3 py-2 text-[13px] text-ink2">
                    <span className="text-[11px] font-bold text-muted">{c.label}</span>
                    <span className="font-bold text-ink">{c.value}</span>
                  </span>
                ))}
              </div>

              <div className="mt-[18px]">
                <div className="mb-[7px] flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink2">전체 진행률</span>
                  <span className="text-[13px] font-bold text-brand">{done} / {total}화 · {pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-wash">
                  <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        {showStats && (
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", animation: "pw-fade .25s ease" }}>
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-hairline bg-white p-[18px]">
                <div className="text-xs font-bold text-muted">{s.label}</div>
                <div className={"mt-1.5 text-2xl font-bold tracking-[-0.5px] " + (s.brand ? "text-brand" : "text-ink")}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* PRIVATE NOTICE */}
        {isPrivate && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-[18px] py-4">
            <span className="text-base">🔒</span>
            <span className="text-[13px] leading-[1.5] text-muted">비공개 작품이에요. 판매 등록하면 조회·구매·후원 통계를 볼 수 있어요.</span>
          </div>
        )}

        {/* CHAPTER LIST */}
        <div className="rounded-xl border border-hairline bg-white p-[22px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">회차 목록</span>
              <span className="text-[13px] font-bold text-muted">{emptyMode ? "0화" : `${CHAPTERS.length}화`}</span>
            </div>
            <button onClick={() => showToast("다음 회차 생성을 시작합니다 (생성 로딩 C3)")} className="inline-flex h-10 items-center gap-1.5 rounded border-none bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover">+ 다음 회차 생성</button>
          </div>

          {emptyMode ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[15px] font-bold text-ink2">아직 회차가 없어요</div>
              <div className="mt-1.5 text-[13px] text-muted">첫 회차를 생성하면 여기에 쌓여요.</div>
              <button onClick={() => showToast("첫 회차 생성을 시작합니다 (C3)")} className="mt-[18px] h-[46px] rounded border-none bg-brand px-[22px] text-[15px] font-bold text-white">✦ 첫 회차 생성하기</button>
            </div>
          ) : (
            <div className="flex flex-col">
              {CHAPTERS.map((c) => {
                const g = GRADE_MAP[c.grade], cs = STATE_MAP[c.state];
                const generating = c.state === "generating";
                return (
                  <div key={c.num} className="flex items-center gap-3.5 border-b border-[#f4f4f4] px-2 py-3.5 last:border-b-0">
                    <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-wash text-sm font-bold text-brand">{c.num}</span>
                    <button onClick={() => showToast(`${c.num}화 편집 — 에디터로 이동 (C4)`)} className="min-w-0 flex-1 border-none bg-transparent p-0 text-left">
                      <div className="truncate text-sm font-bold text-ink">{c.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">{c.length}</span>
                        <span className={"rounded-full px-[9px] py-[3px] text-[11px] font-bold " + g.cls}>{g.label}</span>
                        <span className={"rounded-full px-[9px] py-[3px] text-[11px] font-bold " + cs.cls}>{cs.label}</span>
                      </div>
                    </button>
                    {generating ? (
                      <div className="flex flex-shrink-0 items-center gap-[7px] text-xs font-bold text-brand"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wash-2 border-t-brand" />생성 중</div>
                    ) : (
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <ActBtn wide onClick={() => showToast(`${c.num}화 읽기`)}>읽기</ActBtn>
                        <ActBtn onClick={() => showToast(`${c.num}화 편집 — 에디터로 이동 (C4)`)}>✎</ActBtn>
                        <ActBtn onClick={() => showToast(`${c.num}화 재생성`)}>↻</ActBtn>
                        <ActBtn danger onClick={() => setConfirm(`ch-${c.num}`)}>✕</ActBtn>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PUBLISH FOOTER */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hairline bg-white p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={"flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-base font-bold " + (isSelling ? "bg-[#e8f5ee] text-[#2f8f5b]" : "bg-wash text-brand")}>{isSelling ? "✓" : "₩"}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{isSelling ? "판매 중 · 기여 게이트 통과" : "아직 판매하지 않는 작품이에요"}</div>
              <div className="mt-0.5 text-[13px] leading-[1.5] text-muted">{isSelling ? '모든 회차가 "AI 보조" 이상이라 판매 조건을 충족해요.' : "판매하려면 회차별 창작 기여 점검을 거쳐요."}</div>
            </div>
          </div>
          <button onClick={() => showToast("판매 등록으로 이동합니다 (S2)")} className="pw-btn-slight h-11 flex-shrink-0 px-[18px] text-sm">{isSelling ? "판매 관리" : "판매 등록"}</button>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {confirm && (
        <div onClick={() => setConfirm(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[360px] rounded-[14px] bg-white p-[26px]" style={{ animation: "pw-pop .22s ease" }}>
            <div className="text-[17px] font-bold text-ink">{confirmWork ? "작품을 삭제할까요?" : "회차를 삭제할까요?"}</div>
            <div className="mt-2.5 text-sm leading-[1.6] text-ink2">{confirmWork ? "작품과 모든 회차가 영구 삭제돼요. 되돌릴 수 없어요." : "이 회차가 영구 삭제돼요. 되돌릴 수 없어요."}</div>
            <div className="mt-[22px] flex gap-2.5">
              <button onClick={() => setConfirm(null)} className="h-12 flex-1 rounded border border-line2 bg-white text-[15px] font-bold text-ink2">취소</button>
              <button onClick={() => { setConfirm(null); showToast("삭제되었습니다"); }} className="h-12 flex-1 rounded border-none bg-error text-[15px] font-bold text-white">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* demo status toggle */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={isPrivate && !emptyMode} onClick={() => { setStatus("private"); setEmptyMode(false); }}>비공개</DemoSeg>
        <DemoSeg active={status === "public" && !emptyMode} onClick={() => { setStatus("public"); setEmptyMode(false); }}>공개</DemoSeg>
        <DemoSeg active={isSelling && !emptyMode} onClick={() => { setStatus("selling"); setEmptyMode(false); }}>판매중</DemoSeg>
        <DemoSeg active={emptyMode} onClick={() => setEmptyMode(true)}>빈 회차</DemoSeg>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function ActBtn({ onClick, danger, wide, children }: { onClick: () => void; danger?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"flex h-[34px] flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-hairline bg-white text-[13px] font-bold transition hover:bg-canvas " + (wide ? "px-2.5" : "w-[34px]") + (danger ? " text-[#c4849f] hover:text-error" : " text-ink2 hover:text-brand")}>
      {children}
    </button>
  );
}
function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-[11px] py-[7px] text-xs font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
