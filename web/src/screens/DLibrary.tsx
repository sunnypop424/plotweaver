import { useEffect, useRef, useState } from "react";
import { LibraryCard, type WorkStatus } from "../components/LibraryCard";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

type Work = { id: number; title: string; genre: string; updated: string; done: number; total: number; status: WorkStatus; variant: number };

const ALL: Work[] = [
  { id: 1, title: "회귀한 검, 황혼을 베다", genre: "회귀·복수", updated: "2일 전", done: 12, total: 30, status: "selling", variant: 0 },
  { id: 2, title: "악녀는 두 번 울지 않는다", genre: "로맨스판타지", updated: "5일 전", done: 8, total: 24, status: "public", variant: 2 },
  { id: 3, title: "현대 마법사 표류기", genre: "현대 판타지", updated: "1주 전", done: 3, total: 20, status: "private", variant: 4 },
  { id: 4, title: "폐허의 연금술사", genre: "이세계·성장", updated: "3주 전", done: 30, total: 30, status: "selling", variant: 1 },
  { id: 5, title: "검은 탑의 마지막 기사", genre: "다크 판타지", updated: "오늘", done: 1, total: 12, status: "private", variant: 5 },
  { id: 6, title: "별을 삼킨 아이", genre: "SF·드라마", updated: "2주 전", done: 6, total: 18, status: "public", variant: 3 },
];

const FILTERS: { key: WorkStatus | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "private", label: "비공개" },
  { key: "public", label: "공개" },
  { key: "selling", label: "판매중" },
];

type Mode = "normal" | "empty";

export default function DLibrary() {
  const { vw } = useViewport();
  const { toast, showToast } = useToast();
  const isWide = vw >= 1024;
  const loadT = useRef<number | undefined>(undefined);

  const [filter, setFilter] = useState<WorkStatus | "all">("all");
  const [mode, setMode] = useState<Mode>("normal");
  const [loading, setLoading] = useState(false);

  useEffect(() => () => window.clearTimeout(loadT.current), []);

  const isEmpty = mode === "empty";
  const counts = {
    all: ALL.length,
    private: ALL.filter((w) => w.status === "private").length,
    public: ALL.filter((w) => w.status === "public").length,
    selling: ALL.filter((w) => w.status === "selling").length,
  };

  const filtered = isEmpty ? [] : ALL.filter((w) => filter === "all" || w.status === filter);
  const showEmpty = !loading && isEmpty;
  const showNoResult = !loading && !isEmpty && filtered.length === 0;
  const showGrid = !loading && !isEmpty && filtered.length > 0;

  const demoLoading = () => {
    setMode("normal"); setLoading(true);
    window.clearTimeout(loadT.current);
    loadT.current = window.setTimeout(() => setLoading(false), 1800);
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* GLOBAL NAV (light) */}
      <div className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex h-16 items-center justify-between px-6" style={{ maxWidth: 1180 }}>
          <div className="flex items-center gap-7">
            <span className="text-xl font-bold tracking-[-0.5px] text-brand">플롯위버</span>
            {isWide && (
              <div className="flex items-center gap-[22px]">
                <button onClick={() => showToast("작업실")} className="border-none bg-transparent p-1.5 text-sm font-bold text-ink">작업실</button>
                <button onClick={() => showToast("마켓으로 이동")} className="border-none bg-transparent p-1.5 text-sm font-bold text-muted transition-colors hover:text-brand">마켓</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => showToast("지갑·충전으로 이동")} className="rounded px-2.5 py-2 text-[13px] font-bold text-ink2 transition hover:bg-wash hover:text-brand">잉크 2,000</button>
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-wash text-sm font-bold text-brand">지</div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-8" style={{ maxWidth: 1180 }}>
        {/* HEADER */}
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[28px] font-bold tracking-[-0.5px] text-ink">내 작업실</div>
            <div className="mt-[5px] text-sm text-muted">{isEmpty ? "아직 작품이 없어요" : `${counts.all}개의 작품 · ${counts.selling}개 판매중`}</div>
          </div>
          <button onClick={() => showToast("새 작품 설정 위저드로 이동합니다")} className="inline-flex h-12 items-center gap-2 rounded border-none bg-brand px-5 text-[15px] font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 4px 14px rgba(129,107,255,0.32)" }}>
            + 새 작품
          </button>
        </div>

        {/* FILTER TABS */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = isEmpty ? 0 : counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={"inline-flex h-10 items-center gap-[7px] rounded-full border px-4 text-sm font-bold transition " + (active ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}
              >
                {f.label}
                <span className={"rounded-full px-[7px] py-px text-xs font-bold " + (active ? "bg-white/[0.22] text-white" : "bg-wash text-brand")}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-white">
                <div className="pw-skel aspect-[16/9]" style={{ height: "auto", borderRadius: 0 }} />
                <div className="p-4">
                  <div className="mb-3.5 h-2 rounded-full bg-hairline" />
                  <div className="flex gap-[7px]">
                    <div className="h-[38px] flex-1 rounded bg-[#f0f0f0]" />
                    <div className="h-[38px] flex-1 rounded bg-[#f0f0f0]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="rounded-2xl border border-dashed border-wash-2 bg-white px-6 py-[72px] text-center" style={{ animation: "pw-fade .3s ease" }}>
            <div className="mx-auto mb-[22px] flex h-[88px] w-[88px] items-center justify-center rounded-[20px] bg-wash">
              <div className="h-[58px] w-[46px] rounded" style={{ background: "linear-gradient(135deg,#816bff,#a892ff)", boxShadow: "0 6px 16px rgba(129,107,255,0.4)", transform: "rotate(-6deg)" }} />
            </div>
            <div className="text-xl font-bold text-ink">첫 작품을 만들어보세요</div>
            <div className="mx-auto mt-2 max-w-[360px] text-sm leading-[1.6] text-muted">설정만 넣으면 AI가 1회차를 써줘요.<br />완성한 작품은 여기 작업실에 차곡차곡 쌓여요.</div>
            <button onClick={() => showToast("새 작품 설정 위저드로 이동합니다")} className="mt-[26px] h-[52px] rounded border-none bg-brand px-[26px] text-base font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 6px 18px rgba(129,107,255,0.35)" }}>+ 새 작품 만들기</button>
          </div>
        ) : showNoResult ? (
          <div className="rounded-xl border border-hairline bg-white px-6 py-14 text-center" style={{ animation: "pw-fade .3s ease" }}>
            <div className="text-base font-bold text-ink2">이 상태의 작품이 없어요</div>
            <div className="mt-1.5 text-sm text-muted">다른 필터를 선택해 보세요.</div>
            <button onClick={() => setFilter("all")} className="pw-btn-slight mt-[18px] h-[42px] px-[18px] text-sm">전체 보기</button>
          </div>
        ) : showGrid ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", animation: "pw-fade .3s ease" }}>
            {filtered.map((w) => (
              <LibraryCard
                key={w.id}
                {...w}
                onOpen={() => showToast(`「${w.title}」 에디터로 이동합니다`)}
                onWrite={() => showToast(`「${w.title}」 이어쓰기`)}
                onCover={() => showToast(`「${w.title}」 표지 만들기`)}
                onSell={() => showToast(w.status === "selling" ? "판매 관리로 이동" : `「${w.title}」 판매 등록`)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* demo state switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={mode === "normal" && !loading} onClick={() => { setMode("normal"); setLoading(false); }}>목록</DemoSeg>
        <DemoSeg active={loading} onClick={demoLoading}>로딩</DemoSeg>
        <DemoSeg active={mode === "empty"} onClick={() => { setMode("empty"); setLoading(false); }}>빈 상태</DemoSeg>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-3 py-[7px] text-[13px] font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
