import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkCard, type Badge } from "@/components/WorkCard";
import { useToast } from "@/components/Toast";
import { GlobalNav } from "@/components/GlobalNav";
import { listNovels } from "@/lib/api";

type Work = { id: string; title: string; author: string; rating: string; price: string; badge: Badge; variant: number; src?: string };

const FILTER_DEFS = [
  { key: "genre", label: "장르" },
  { key: "rating", label: "연령등급" },
  { key: "price", label: "가격" },
] as const;
type FilterKey = (typeof FILTER_DEFS)[number]["key"];

type Mode = "browse" | "search";

export default function MMarketHome() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const searchT = useRef<number | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [activeFilters, setActiveFilters] = useState<Partial<Record<FilterKey, boolean>>>({});
  const [mode, setMode] = useState<Mode>("browse");
  const [searchLoading, setSearchLoading] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    listNovels()
      .then((ns) => setWorks(
        ns.map((n, i) => ({
          id: n.id,
          title: n.title,
          author: "",
          rating: "",
          price: "",
          badge: (n.status === "selling" ? "paid" : "free") as Badge,
          variant: i % 8,
          src: n.cover_url ?? undefined,
        }))
      ))
      .catch(() => {});
  }, []);

  const onQuery = (q: string) => {
    setQuery(q);
    setMode(q.trim() ? "search" : "browse");
    setSearchLoading(!!q.trim());
    window.clearTimeout(searchT.current);
    if (q.trim()) searchT.current = window.setTimeout(() => setSearchLoading(false), 900);
  };
  const toggleFilter = (k: FilterKey) => {
    setActiveFilters((a) => ({ ...a, [k]: !a[k] }));
    showToast(`${FILTER_DEFS.find((f) => f.key === k)!.label} 필터 (데모)`);
  };
  const hasActiveChips = Object.values(activeFilters).some(Boolean);

  const wc = (w: Work) => ({ ...w, onOpen: () => navigate(`/market/${w.id}`) });
  const results = works.filter((w) => w.title.includes(query.trim()));
  const recommend = works.slice(0, 5);
  const searchEmpty = mode === "search" && !searchLoading && results.length === 0;
  const searchResults = mode === "search" && !searchLoading && !searchEmpty && results.length > 0;

  return (
    <div className="min-h-screen bg-canvas">
      {/* GLOBAL NAV */}
      <GlobalNav active="market" search={
        <div className="relative mx-auto max-w-[480px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#b4b4b4]">⌕</span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="작품·작가·태그 검색"
            className="h-[42px] w-full rounded-full border border-hairline bg-canvas pl-[38px] pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
          />
        </div>
      } />

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
            {works.length > 0 && (
              <div className="mb-9">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🏆</span>
                    <span className="text-xl font-bold tracking-[-0.4px] text-ink">전체 작품</span>
                  </div>
                </div>
                <div className="pw-scroll flex gap-4 overflow-x-auto pb-2.5">
                  {works.slice(0, 5).map((w) => (
                    <WorkCard key={w.id} {...wc(w)} className="w-[170px] flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2">
              <div className="mb-4 text-xl font-bold tracking-[-0.4px] text-ink">전체 작품 ({works.length})</div>
              {works.length === 0 ? (
                <div className="rounded-xl border border-hairline bg-white px-6 py-12 text-center">
                  <div className="text-base font-bold text-ink2">아직 출판된 작품이 없어요</div>
                  <div className="mt-1.5 text-sm text-muted">첫 번째 작가가 되어 보세요!</div>
                </div>
              ) : (
                <Grid works={works.map(wc)} />
              )}
            </div>
          </div>
        )}
      </div>

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

