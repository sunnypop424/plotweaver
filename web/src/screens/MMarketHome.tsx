import { useRef, useState } from "react";
import { WorkCard, type Badge } from "../components/WorkCard";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

type Work = { title: string; author: string; rating: string; price: string; badge: Badge; variant: number };

const WORKS: Work[] = [
  { title: "회귀한 검사", author: "지훈", rating: "4.8", price: "3,000원", badge: "paid", variant: 0 },
  { title: "악녀의 일기", author: "세라", rating: "4.6", price: "", badge: "free", variant: 2 },
  { title: "현대 마법사", author: "도윤", rating: "4.7", price: "", badge: "tip", variant: 3 },
  { title: "황혼의 기사단", author: "린", rating: "4.9", price: "4,500원", badge: "paid", variant: 1 },
  { title: "폐허의 연금술사", author: "하루", rating: "4.5", price: "", badge: "free", variant: 4 },
  { title: "서리의 군주", author: "강", rating: "4.8", price: "2,500원", badge: "paid", variant: 5 },
  { title: "검은 탑의 연인", author: "유나", rating: "4.4", price: "", badge: "tip", variant: 6 },
  { title: "별을 삼킨 아이", author: "소리", rating: "4.7", price: "3,500원", badge: "paid", variant: 7 },
  { title: "붉은 달의 맹세", author: "한별", rating: "4.3", price: "", badge: "free", variant: 2 },
  { title: "이세계 식당", author: "미오", rating: "4.9", price: "5,000원", badge: "paid", variant: 1 },
];

const FILTER_DEFS = [
  { key: "genre", label: "장르" },
  { key: "rating", label: "연령등급" },
  { key: "price", label: "가격" },
] as const;
type FilterKey = (typeof FILTER_DEFS)[number]["key"];

const RAILS = [
  { emoji: "🏆", title: "베스트셀러", idx: [0, 9, 3, 7, 5] },
  { emoji: "✨", title: "취향 추천", idx: [2, 1, 6, 8, 4] },
  { emoji: "🌱", title: "신작", idx: [8, 7, 6, 5, 0] },
];

type Mode = "browse" | "search";

export default function MMarketHome() {
  const { vw } = useViewport();
  const { toast, showToast } = useToast();
  const isWide = vw >= 1024;
  const searchT = useRef<number | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [activeFilters, setActiveFilters] = useState<Partial<Record<FilterKey, boolean>>>({});
  const [mode, setMode] = useState<Mode>("browse");
  const [searchLoading, setSearchLoading] = useState(false);
  const [forceEmpty, setForceEmpty] = useState(false);

  const onQuery = (q: string) => {
    setQuery(q);
    setMode(q.trim() ? "search" : "browse");
    setSearchLoading(!!q.trim());
    setForceEmpty(false);
    window.clearTimeout(searchT.current);
    if (q.trim()) searchT.current = window.setTimeout(() => setSearchLoading(false), 900);
  };
  const toggleFilter = (k: FilterKey) => {
    setActiveFilters((a) => ({ ...a, [k]: !a[k] }));
    showToast(`${FILTER_DEFS.find((f) => f.key === k)!.label} 필터 (데모)`);
  };
  const hasActiveChips = Object.values(activeFilters).some(Boolean);

  const wc = (w: Work) => ({ ...w, onOpen: () => showToast(`「${w.title}」 판매페이지로 이동합니다`) });
  const results = WORKS.filter((w) => w.title.includes(query.trim()));
  const recommend = [0, 3, 7, 5, 9].map((i) => WORKS[i]);
  const searchEmpty = mode === "search" && !searchLoading && (forceEmpty || results.length === 0);
  const searchResults = mode === "search" && !searchLoading && !searchEmpty && results.length > 0;

  return (
    <div className="min-h-screen bg-canvas">
      {/* GLOBAL NAV (market) */}
      <div className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex h-16 items-center gap-[18px] px-6" style={{ maxWidth: 1180 }}>
          <span className="flex-shrink-0 text-xl font-bold tracking-[-0.5px] text-brand">플롯위버</span>
          {isWide && (
            <div className="flex flex-shrink-0 items-center gap-5">
              <button onClick={() => showToast("작업실로 이동")} className="border-none bg-transparent p-1.5 text-sm font-bold text-muted transition-colors hover:text-brand">작업실</button>
              <button onClick={() => showToast("마켓")} className="border-none bg-transparent p-1.5 text-sm font-bold text-ink">마켓</button>
            </div>
          )}
          <div className="relative mx-auto max-w-[480px] flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#b4b4b4]">⌕</span>
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="작품·작가·태그 검색"
              className="h-[42px] w-full rounded-full border border-hairline bg-canvas pl-[38px] pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
            />
          </div>
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">지</div>
        </div>
      </div>

      {/* FILTER / SORT BAR */}
      <div className="sticky top-16 z-20 border-b border-hairline bg-white">
        <div className="mx-auto flex flex-wrap items-center gap-2.5 px-6 py-3" style={{ maxWidth: 1180 }}>
          <div className="flex flex-1 flex-wrap gap-2">
            {FILTER_DEFS.map((f) => {
              const on = !!activeFilters[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={"inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}
                >
                  {f.label} <span className="text-[10px] opacity-60">▾</span>
                </button>
              );
            })}
            {hasActiveChips && (
              <button onClick={() => setActiveFilters({})} className="h-9 rounded-full border-none bg-transparent px-3 text-[13px] font-bold text-muted">초기화 ×</button>
            )}
          </div>
          <div className="pw-select-wrap flex-shrink-0">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 cursor-pointer rounded-full border border-hairline bg-white pl-3.5 pr-[30px] text-[13px] font-bold text-ink2 outline-none focus:border-brand" style={{ appearance: "none", WebkitAppearance: "none" }}>
              <option value="popular">인기순</option>
              <option value="latest">최신순</option>
              <option value="rating">평점순</option>
              <option value="price">가격 낮은순</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted">▼</span>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-6" style={{ maxWidth: 1180 }}>
        {mode === "search" ? (
          <div>
            <div className="mb-4 text-[15px] font-bold text-ink">'{query}' 검색 결과</div>
            {searchLoading ? (
              <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="pw-skel aspect-[3/4] rounded-lg" style={{ height: "auto" }} />)}
              </div>
            ) : searchEmpty ? (
              <>
                <div className="mb-8 rounded-xl border border-hairline bg-white px-6 py-12 text-center">
                  <div className="text-base font-bold text-ink2">'{query}'에 대한 결과가 없어요</div>
                  <div className="mt-1.5 text-sm text-muted">대신 이런 작품은 어때요?</div>
                </div>
                <div className="mb-3.5 text-[15px] font-bold text-ink">추천 작품</div>
                <Grid works={recommend.map(wc)} />
              </>
            ) : searchResults ? (
              <Grid works={results.map(wc)} />
            ) : null}
          </div>
        ) : (
          <div>
            {RAILS.map((rail) => (
              <div key={rail.title} className="mb-9">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{rail.emoji}</span>
                    <span className="text-xl font-bold tracking-[-0.4px] text-ink">{rail.title}</span>
                  </div>
                  <button onClick={() => showToast(`${rail.title} 전체보기`)} className="border-none bg-transparent px-1 py-1.5 text-[13px] font-bold text-muted transition-colors hover:text-brand">전체 ›</button>
                </div>
                <div className="pw-scroll flex gap-4 overflow-x-auto pb-2.5">
                  {rail.idx.map((i) => (
                    <WorkCard key={i} {...wc(WORKS[i])} className="w-[170px] flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-2">
              <div className="mb-4 text-xl font-bold tracking-[-0.4px] text-ink">전체 작품</div>
              <Grid works={WORKS.map(wc)} />
            </div>
          </div>
        )}
      </div>

      {/* demo switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={mode === "browse"} onClick={() => { setMode("browse"); setQuery(""); setSearchLoading(false); setForceEmpty(false); }}>탐색</DemoSeg>
        <DemoSeg active={mode === "search" && !forceEmpty} onClick={() => { setMode("search"); setQuery("회귀"); setSearchLoading(false); setForceEmpty(false); }}>검색결과</DemoSeg>
        <DemoSeg active={forceEmpty} onClick={() => { setMode("search"); setQuery("존재하지않는작품"); setSearchLoading(false); setForceEmpty(true); }}>0건</DemoSeg>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function Grid({ works }: { works: (Work & { onOpen: () => void })[] }) {
  return (
    <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
      {works.map((w, i) => <WorkCard key={i} {...w} />)}
    </div>
  );
}

function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-[11px] py-[7px] text-xs font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
