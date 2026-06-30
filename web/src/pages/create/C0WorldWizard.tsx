import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useCanvasDrag } from "@/lib/useCanvasDrag";
import { useWizard } from "@/providers/WizardProvider";
import { suggestWorld } from "@/lib/api";

/* ── 옵션 / 장르 적응형 키트 ─────────────────────────────────────────── */
const ERA_OPTIONS = ["동양 무협", "중세 유럽", "조선시대", "현대 도시", "근미래 SF", "이세계 판타지"];
const ERA_DEFAULT_GENRES: Record<string, string[]> = {
  "동양 무협": ["무협", "회귀", "복수"],
  "중세 유럽": ["기사", "로맨스판타지", "악역영애"],
  "조선시대": ["사극", "빙의", "궁중"],
  "현대 도시": ["현대", "오피스", "로맨스"],
  "근미래 SF": ["SF", "헌터", "디스토피아"],
  "이세계 판타지": ["이세계", "로맨스판타지", "회귀"],
};
const GENRE_PRESET = ["환생", "빙의", "로맨스판타지", "헌터", "대체역사", "퓨전"];
const PALETTE = ["#816bff", "#2a6fdb", "#1f8a5b", "#d9822b", "#c0504e", "#242537"];
const REL_OPTIONS = ["교역로", "국경", "동맹", "적대", "종속", "교류"];

type Kit = { label: string; factionCats: string[]; glossaryCats: string[]; leaderHint: string };
const KITS: Record<string, Kit> = {
  murim: { label: "동양 무협 세계 · 문파 기반 분류", factionCats: ["정파", "사파", "마교", "관(官)", "세가", "기타"], glossaryCats: ["지명", "무공", "아이템", "세력", "기타"], leaderHint: "예: 장문인" },
  fantasy: { label: "이세계 판타지 · 왕국·가문 기반 분류", factionCats: ["왕국", "제국", "공국·가문", "길드", "교단", "기사단", "종족", "기타"], glossaryCats: ["지명", "마법", "아이템", "종족", "기타"], leaderHint: "예: 국왕" },
  modern: { label: "현대·SF · 조직·기업 기반 분류", factionCats: ["기업", "기관", "조직", "정부", "기타"], glossaryCats: ["지명", "기술", "조직", "인물", "기타"], leaderHint: "예: 대표이사" },
  generic: { label: "기본 분류", factionCats: ["세력", "조직", "국가", "기타"], glossaryCats: ["지명", "용어", "기타"], leaderHint: "예: 대표" },
};
const kitFor = (e: string) =>
  e.includes("무협") ? "murim"
  : e.includes("판타지") || e.includes("이세계") ? "fantasy"
  : e.includes("SF") || e.includes("현대") || e.includes("근미래") ? "modern"
  : "generic";

/* ── 타입 ────────────────────────────────────────────────────────────── */
type Faction = { id: number; name: string; color: string; category: string; categoryCustom: boolean; leader: string; parentId: string; desc: string };
type Rank = { id: number; name: string; desc: string; variants: string[] };
type Term = { id: number; term: string; category: string; categoryCustom: boolean; meaning: string };
type Region = { id: number; name: string; factionId: number | ""; desc: string; x: number; y: number };
type MapEdge = { id: number; from: number; to: number; label: string; labelCustom: boolean; desc: string };


export default function C0WorldWizard() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { saveWorld, hasDraft, restoreDraft, discardDraft, data: wizData } = useWizard();
  const isEditMode = !!wizData.editingNovelId;

  const maxId = (arr: { id: number }[]) => arr.length ? Math.max(...arr.map((x) => x.id)) : 0;
  const fid   = useRef(maxId(wizData.worldFactionsData));
  const rid   = useRef(maxId(wizData.worldRanksData));
  const gid   = useRef(Object.keys(wizData.glossaryDict).length);
  const regId = useRef(maxId(wizData.worldRegions));
  const eid   = useRef(maxId(wizData.worldMapEdges));
  const aiTimer = useRef<number | undefined>(undefined);
  const mapTimer = useRef<number | undefined>(undefined);

  const [tab, setTab] = useState<"settings" | "map">("settings");
  const [era, setEra] = useState(() => {
    if (!wizData.era) return { value: "동양 무협", custom: false, text: "" };
    return ERA_OPTIONS.includes(wizData.era)
      ? { value: wizData.era, custom: false, text: "" }
      : { value: "", custom: true, text: wizData.era };
  });
  const [genres, setGenres] = useState<string[]>(() => wizData.genres.length ? wizData.genres : []);
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [genreCustomText, setGenreCustomText] = useState("");

  const [factions, setFactions] = useState<Faction[]>(() => (wizData.worldFactionsData as Faction[]) ?? []);
  const [ranks, setRanks] = useState<Rank[]>(() => (wizData.worldRanksData as Rank[]) ?? []);
  const [glossary, setGlossary] = useState<Term[]>(() => {
    const entries = Object.entries(wizData.glossaryDict);
    if (entries.length) return entries.map(([term, meaning], i) => ({ id: i + 1, term, category: "기타", categoryCustom: false, meaning }));
    return [];
  });
  const [worldRules, setWorldRules] = useState(wizData.worldRules || "");
  const [taboos, setTaboos] = useState(wizData.constraints || "");

  const [regions, setRegions] = useState<Region[]>(() => (wizData.worldRegions as Region[]) ?? []);
  const [mapEdges, setMapEdges] = useState<MapEdge[]>(() => (wizData.worldMapEdges as MapEdge[]) ?? []);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [mapAutoLoading, setMapAutoLoading] = useState(false);

  const [powerSystem, setPowerSystem] = useState(() => ({
    enabled: wizData.powerSystem?.enabled ?? false,
    rankNames: wizData.powerSystem?.rankNames ?? "",
    coreRule: wizData.powerSystem?.coreRule ?? "",
    protagonistRank: wizData.powerSystem?.protagonistRank ?? "",
    protagonistGoal: wizData.powerSystem?.protagonistGoal ?? "",
    limitation: wizData.powerSystem?.limitation ?? "",
  }));
  const patchPS = (patch: Partial<typeof powerSystem>) => setPowerSystem((s) => ({ ...s, ...patch }));

  const eraVal = era.custom ? era.text.trim() : era.value;
  const kit = KITS[kitFor(eraVal)];

  /* ── 월드맵 인터랙션 (C2와 공통 훅: 지역 카드 반폭 64 / 반높이 26) ──────── */
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { movedRef, startDrag } = useCanvasDrag({
    canvasRef, halfW: 64, halfH: 26,
    onDrag: (id, x, y) => setRegions((rs) => rs.map((n) => (n.id === id ? { ...n, x, y } : n))),
    onEscape: () => clearMapSel(),
  });
  useEffect(() => () => { window.clearTimeout(aiTimer.current); window.clearTimeout(mapTimer.current); }, []);

  /* ── 액션: 장르 ─────────────────────────────────────────────────────── */
  const removeGenre = (g: string) => setGenres((gs) => gs.filter((x) => x !== g));
  const addGenre = (g: string) => { setGenres((gs) => (gs.includes(g) ? gs : [...gs, g])); setGenrePickerOpen(false); };
  const addCustomGenre = () => {
    const t = genreCustomText.trim();
    if (!t || genres.includes(t)) return setGenreCustomText("");
    setGenres((gs) => [...gs, t]); setGenreCustomText(""); setGenrePickerOpen(false);
  };
  const availGenres = GENRE_PRESET.filter((o) => !genres.includes(o));

  /* ── 액션: 세력 ─────────────────────────────────────────────────────── */
  const updateFaction = (id: number, patch: Partial<Faction>) => setFactions((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const addFaction = () => setFactions((fs) => [...fs, { id: ++fid.current, name: "", color: PALETTE[fs.length % PALETTE.length], category: "", categoryCustom: false, leader: "", parentId: "", desc: "" }]);
  const removeFaction = (id: number) => {
    setFactions((fs) => fs.filter((f) => f.id !== id));
    setRegions((rs) => rs.map((r) => (r.factionId === id ? { ...r, factionId: "" } : r)));
  };

  /* ── 액션: 계급 ─────────────────────────────────────────────────────── */
  const updateRank = (id: number, patch: Partial<Rank>) => setRanks((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRank = () => setRanks((rs) => [...rs, { id: ++rid.current, name: "", desc: "", variants: [] }]);
  const removeRank = (id: number) => setRanks((rs) => rs.filter((r) => r.id !== id));
  const moveRank = (id: number, dir: -1 | 1) => setRanks((rs) => {
    const arr = [...rs];
    const i = arr.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return rs;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });
  // 세부 지위 (가로 세분화) — 공작 아래 공작부인·공작영애·공작영식 …
  const addVariant = (rankId: number) => setRanks((rs) => rs.map((r) => (r.id === rankId ? { ...r, variants: [...r.variants, ""] } : r)));
  const updateVariant = (rankId: number, idx: number, val: string) => setRanks((rs) => rs.map((r) => (r.id === rankId ? { ...r, variants: r.variants.map((v, i) => (i === idx ? val : v)) } : r)));
  const removeVariant = (rankId: number, idx: number) => setRanks((rs) => rs.map((r) => (r.id === rankId ? { ...r, variants: r.variants.filter((_, i) => i !== idx) } : r)));

  /* ── 액션: 용어 ─────────────────────────────────────────────────────── */
  const updateTerm = (id: number, patch: Partial<Term>) => setGlossary((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const addTerm = () => setGlossary((ts) => [...ts, { id: ++gid.current, term: "", category: "", categoryCustom: false, meaning: "" }]);
  const removeTerm = (id: number) => setGlossary((ts) => ts.filter((t) => t.id !== id));
  const onTermCat = (id: number, val: string) => {
    if (val === "__custom") updateTerm(id, { categoryCustom: true, category: "" });
    else updateTerm(id, { category: val });
  };

  /* ── 액션: 지역 / 연결(월드맵) ──────────────────────────────────────── */
  const updateRegion = (id: number, patch: Partial<Region>) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const updateEdge = (id: number, patch: Partial<MapEdge>) => setMapEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const clearMapSel = () => { setSelectedRegionId(null); setSelectedEdgeId(null); };
  const selectRegion = (id: number) => { setSelectedRegionId(id); setSelectedEdgeId(null); };
  const selectEdge = (id: number) => { setSelectedEdgeId(id); setSelectedRegionId(null); };

  const addRegion = () => {
    const id = ++regId.current;
    setRegions((rs) => {
      const x = 140 + (rs.length * 60) % 360;
      const y = 130 + (rs.length * 50) % 240;
      return [...rs, { id, name: "새 지역", factionId: "", desc: "", x, y }];
    });
    selectRegion(id);
    setTab("map");
  };
  const removeRegion = (id: number) => {
    setRegions((rs) => rs.filter((r) => r.id !== id));
    setMapEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    clearMapSel();
  };
  const removeEdge = (id: number) => { setMapEdges((es) => es.filter((e) => e.id !== id)); setSelectedEdgeId(null); };

  // 지역 A 클릭 → B 클릭 = 연결 생성(또는 기존 연결 선택). C2의 createOrSelectEdge와 동일.
  const createOrConnect = (a: number, b: number) => {
    const existing = mapEdges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    if (existing) { selectEdge(existing.id); return; }
    const id = ++eid.current;
    setMapEdges((es) => [...es, { id, from: a, to: b, label: "교역로", labelCustom: false, desc: "" }]);
    selectEdge(id);
    showToast("연결을 만들었어요 · 오른쪽에서 관계를 정해보세요");
  };
  const onRegionTap = (id: number) => {
    if (selectedRegionId == null) selectRegion(id);
    else if (selectedRegionId === id) setSelectedRegionId(null);
    else createOrConnect(selectedRegionId, id);
  };

  /* ── AI 자동 채움 ───────────────────────────────────────────────────── */
  const aiAutofill = async () => {
    setAiLoading(true); setGenrePickerOpen(false);
    const synopsis = wizData.goal || "";
    try {
      const res = await suggestWorld({ era: eraVal, genres, synopsis, worldRules, factionCats: kit.factionCats });
      const rawFactions = res.factions.map((f) => ({ ...f, id: ++fid.current }));
      // parentIndex → 실제 ID로 매핑
      const newFactions = rawFactions.map((f, i) => ({
        ...f,
        parentId: res.factions[i].parentIndex >= 0 && rawFactions[res.factions[i].parentIndex]
          ? String(rawFactions[res.factions[i].parentIndex].id)
          : "",
      }));
      setFactions(newFactions);
      setRanks(res.ranks.map((r) => ({ ...r, id: ++rid.current })));
      setGlossary(res.glossary.map((t) => ({ ...t, id: ++gid.current })));
      setWorldRules(res.worldRules);
      setTaboos(res.taboos);
      // 월드맵 지역도 함께 생성
      if (res.regions?.length) {
        const newRegions = res.regions.map((r) => ({
          id: ++regId.current,
          name: r.name,
          factionId: (r.factionIndex >= 0 && newFactions[r.factionIndex] ? newFactions[r.factionIndex].id : "") as number | "",
          desc: r.desc,
          x: r.x,
          y: r.y,
        }));
        setRegions(newRegions);
        if (res.mapEdges?.length) {
          setMapEdges(res.mapEdges.map((e) => ({
            id: ++eid.current,
            from: newRegions[e.fromIndex]?.id ?? newRegions[0].id,
            to: newRegions[e.toIndex]?.id ?? newRegions[1].id,
            label: e.label,
            labelCustom: true,
            desc: e.desc,
          })));
        }
      }
      showToast("AI가 세계관 초안을 채웠어요");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "AI 생성 실패");
    } finally {
      setAiLoading(false);
    }
  };

  const mapAutoRecommend = async () => {
    setMapAutoLoading(true);
    try {
      const res = await suggestWorld({ era: eraVal, genres, synopsis: wizData.goal || "", worldRules, factionCats: kit.factionCats });
      const rawFacs = factions.length ? factions : res.factions.map((f) => ({ ...f, id: ++fid.current }));
      const newFactions = factions.length ? rawFacs : rawFacs.map((f, i) => ({
        ...f,
        parentId: res.factions[i]?.parentIndex >= 0 && rawFacs[res.factions[i].parentIndex]
          ? String(rawFacs[res.factions[i].parentIndex].id)
          : "",
      }));
      if (!factions.length) setFactions(newFactions);
      if (res.regions?.length) {
        const newRegions = res.regions.map((r) => ({
          id: ++regId.current,
          name: r.name,
          factionId: (r.factionIndex >= 0 && newFactions[r.factionIndex] ? newFactions[r.factionIndex].id : "") as number | "",
          desc: r.desc,
          x: r.x,
          y: r.y,
        }));
        setRegions(newRegions);
        if (res.mapEdges?.length) {
          setMapEdges(res.mapEdges.map((e) => ({
            id: ++eid.current,
            from: newRegions[e.fromIndex]?.id ?? newRegions[0].id,
            to: newRegions[e.toIndex]?.id ?? newRegions[1]?.id ?? newRegions[0].id,
            label: e.label,
            labelCustom: true,
            desc: e.desc,
          })));
        }
        clearMapSel();
      }
      showToast("AI가 지도 초안을 추천했어요");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "AI 생성 실패");
    } finally {
      setMapAutoLoading(false);
    }
  };

  /* ── 파생 계산 ──────────────────────────────────────────────────────── */
  const facById = (id: number | "") => factions.find((f) => f.id === id);
  const facColor = (id: number | "") => facById(id)?.color ?? "#9aa0ad";
  const facName = (id: number | "") => (id === "" ? "무소속" : facById(id)?.name.trim() || "세력");
  const selRegion = regions.find((r) => r.id === selectedRegionId) ?? null;
  const selEdge = mapEdges.find((e) => e.id === selectedEdgeId) ?? null;
  const showSide = isDesktop && tab === "settings";
  const showPanel = isDesktop || tab === "map"; // 우측 컬럼 노출 여부
  const canvasH = isMobile ? 380 : 500;

  const rankChain = ranks.map((r) => r.name.trim()).filter(Boolean);
  const glossFilled = glossary.filter((t) => t.term.trim()).length;

  return (
    <>

      {/* 편집 모드 배너 */}
      {isEditMode && (
        <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-[#ffe4b8] bg-[#fff8ee] px-5 py-3">
          <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-[11px] font-bold text-[#d9822b]">편집 중</span>
          <span className="text-sm font-bold text-[#9a5000]">기존 작품의 설정을 편집하고 있어요. 세계관 시각 맵은 재설정이 필요해요.</span>
        </div>
      )}

      {/* 임시저장 복구 배너 */}
      {!isEditMode && hasDraft && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e3dfff] bg-[#f5f3ff] px-5 py-3">
          <span className="text-sm font-bold text-brand">이전에 작성 중이던 내용이 있어요. 이어서 할까요?</span>
          <div className="flex gap-2">
            <button onClick={discardDraft} className="h-8 rounded px-3.5 text-[13px] font-bold text-muted hover:text-ink">버리기</button>
            <button onClick={() => { restoreDraft(); showToast("임시저장된 내용을 불러왔어요"); }} className="h-8 rounded bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-hover">불러오기</button>
          </div>
        </div>
      )}

      <div className="mx-auto box-border w-full" style={isDesktop ? { maxWidth: 1120, padding: "32px 24px 56px" } : { maxWidth: 680, padding: "24px 16px 132px" }}>
        {/* heading */}
        <div className="mb-5">
          <div className="text-2xl font-bold tracking-[-0.4px] text-ink">세계관</div>
          <div className="mt-1 text-sm text-muted">
            1단계 · 이야기의 무대를 먼저 지어요. 여기서 정한 세력·지위·용어가 다음 단계의 선택지가 돼요.{" "}
            <span className="font-bold text-brand">선택 단계 — 건너뛰어도 괜찮아요.</span>
          </div>
        </div>

        {/* TABS */}
        <div className="mb-[18px] inline-flex gap-1 rounded-full bg-[#efefef] p-1">
          <TabBtn active={tab === "settings"} onClick={() => { setTab("settings"); setGenrePickerOpen(false); }}>설정</TabBtn>
          <TabBtn active={tab === "map"} onClick={() => { setTab("map"); setGenrePickerOpen(false); }}>월드맵</TabBtn>
        </div>

        {/* ── 본문: 좌측(폼/캔버스) + 우측(미리보기/편집) 2단 (C2와 동일 셸) ── */}
        <div style={isDesktop ? { display: "flex", gap: 32, alignItems: "flex-start" } : { display: "flex", flexDirection: "column", gap: 16 }}>
          {/* LEFT */}
          <div className={isDesktop ? "min-w-0 flex-1" : "w-full"}>

            {/* ============ TAB 1 · 설정 ============ */}
            {tab === "settings" && (
              <div>
                {/* AI generate */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-wash-border bg-wash px-[18px] py-4">
                  <div className="min-w-[200px]">
                    <div className="text-[15px] font-bold text-ink">막막하다면, AI에게 맡겨보세요</div>
                    <div className="mt-[3px] text-[13px] text-ink2">시대·장르에 맞춰 세력·계급·용어 초안을 한 번에 채워드려요.</div>
                  </div>
                  {aiLoading ? (
                    <button disabled className="pw-btn-primary h-11 px-[18px] text-[15px] opacity-90" style={{ cursor: "default" }}>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      생성 중...
                    </button>
                  ) : (
                    <button onClick={aiAutofill} className="pw-btn-primary h-11 whitespace-nowrap px-[18px] text-[15px]">✦ AI 세계관 자동 생성</button>
                  )}
                </div>

                {/* 기반: 시대 + 장르 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-4 text-sm font-bold text-ink">기반</div>
                  <div className="mb-[22px]">
                    <HybridSelect label="배경 시대" required custom={era.custom} onToggleCustom={() => { setEra((s) => ({ ...s, custom: !s.custom })); setGenres([]); }} value={era.custom ? era.text : era.value} onChange={(v) => { setEra((s) => (s.custom ? { ...s, text: v } : { ...s, value: v })); if (!era.custom) setGenres(ERA_DEFAULT_GENRES[v] ?? []); }} customPlaceholder="배경 시대를 직접 입력하세요" height={48}>
                      {ERA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </HybridSelect>
                  </div>

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
                          <button onClick={() => removeGenre(g)} className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-brand/[0.18] text-xs leading-none text-brand hover:bg-brand hover:text-white">×</button>
                        </span>
                      ))}
                      <div className="relative">
                        <button onClick={() => setGenrePickerOpen((o) => !o)} className="h-[34px] rounded-full border border-dashed border-[#b6a9ff] bg-transparent px-3.5 text-sm font-bold text-brand transition hover:bg-wash">+ 추가</button>
                        {genrePickerOpen && (
                          <div className="absolute left-0 top-[42px] z-30 w-52 rounded-lg border border-hairline bg-white p-1.5 shadow-pop">
                            {availGenres.map((o) => (
                              <button key={o} onClick={() => addGenre(o)} className="block w-full rounded px-2.5 py-2 text-left text-sm font-bold text-ink transition hover:bg-canvas">{o}</button>
                            ))}
                            <div className="mx-1 my-1.5 h-px bg-hairline" />
                            <div className="flex gap-1.5 px-1 pb-1 pt-0.5">
                              <input value={genreCustomText} onChange={(e) => setGenreCustomText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomGenre()} placeholder="직접 입력" className="h-9 min-w-0 flex-1 rounded border border-hairline px-2.5 text-[13px] text-ink outline-none focus:border-brand" />
                              <button onClick={addCustomGenre} className="pw-btn-primary h-9 whitespace-nowrap px-3 text-[13px]">추가</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3.5 inline-flex items-center gap-[7px] rounded-full border border-[#efecff] bg-[#faf9ff] px-3 py-[7px]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                      <span className="text-[12px] font-bold text-brand">{kit.label}</span>
                    </div>
                  </div>
                </div>

                {/* 국가·세력 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-ink">국가·세력</span>
                      <span className="text-[13px] font-bold text-muted">{factions.length}개</span>
                    </div>
                    <button onClick={addFaction} className="pw-btn-slight h-[38px] px-3.5 text-sm">+ 세력 추가</button>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">세력과 분류·수장·소속 관계를 정의해두면 인물·관계도 단계에서 그대로 쓰여요.</div>

                  {factions.map((f, i) => (
                    <div key={f.id} className="mb-3 rounded-lg border border-hairline p-[18px]">
                      <div className="mb-3.5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-[7px]">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ background: f.color }} />
                          <span className="text-[13px] font-bold text-muted">세력 {i + 1}</span>
                        </span>
                        <button onClick={() => removeFaction(f.id)} className="rounded px-1.5 py-1 text-[13px] font-bold text-muted transition hover:bg-error-wash hover:text-error">× 삭제</button>
                      </div>

                      <div className="mb-3.5 grid grid-cols-2 gap-3.5">
                        <div>
                          <div className="mb-1.5 pw-field-label">세력 이름</div>
                          <input value={f.name} onChange={(e) => updateFaction(f.id, { name: e.target.value })} placeholder="예: 화산파" className="pw-input text-[15px]" style={{ height: 46 }} />
                        </div>
                        <HybridSelect label="분류" custom={f.categoryCustom} onToggleCustom={() => updateFaction(f.id, { categoryCustom: !f.categoryCustom })} value={f.category} onChange={(v) => updateFaction(f.id, { category: v })} customPlaceholder="분류 직접 입력">
                          <option value="">선택</option>
                          {kit.factionCats.map((o) => <option key={o} value={o}>{o}</option>)}
                        </HybridSelect>
                      </div>

                      <div className="mb-3.5 grid grid-cols-2 gap-3.5">
                        <div>
                          <div className="mb-1.5 pw-field-label">수장·대표 지위</div>
                          <input value={f.leader} onChange={(e) => updateFaction(f.id, { leader: e.target.value })} placeholder={kit.leaderHint} className="pw-input text-[15px]" style={{ height: 46 }} />
                        </div>
                        <div>
                          <div className="mb-1.5 pw-field-label">상위 소속 <span className="font-normal text-muted">(선택)</span></div>
                          <div className="pw-select-wrap">
                            <select value={f.parentId} onChange={(e) => updateFaction(f.id, { parentId: e.target.value })} className="pw-select text-[15px]" style={{ height: 46 }}>
                              <option value="">없음 (최상위)</option>
                              {factions.filter((o) => o.id !== f.id).map((o) => <option key={o.id} value={String(o.id)}>{o.name.trim() || "이름 미정"}</option>)}
                            </select>
                            <span className="pw-select-caret">▼</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3.5">
                        <div className="mb-1.5 pw-field-label">한 줄 설명 <span className="font-normal text-muted">(선택)</span></div>
                        <input value={f.desc} onChange={(e) => updateFaction(f.id, { desc: e.target.value })} placeholder="예: 정파 명문 검파" className="pw-input text-[15px]" style={{ height: 46 }} />
                      </div>

                      <div>
                        <div className="mb-2 pw-field-label">소속 색 <span className="font-normal text-muted">· 월드맵·관계도에서 이 색으로 표시돼요</span></div>
                        <div className="flex flex-wrap gap-2.5">
                          {PALETTE.map((col) => (
                            <button key={col} onClick={() => updateFaction(f.id, { color: col })} className="h-[30px] w-[30px] rounded-full border-2 border-white" style={{ background: col, boxShadow: f.color === col ? `0 0 0 2px ${col}` : "0 0 0 1px #e3e3e3" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {factions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-line2 p-[22px] text-center text-[13px] leading-relaxed text-muted">아직 정의한 세력이 없어요.<br />건너뛰어도 되며, 인물 단계에서 직접 입력할 수 있어요.</div>
                  )}
                </div>

                {/* 계급·지위 체계 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-ink">계급·지위·직급 체계</span>
                      <span className="text-[13px] font-bold text-muted">{ranks.length}단계</span>
                    </div>
                    <button onClick={addRank} className="pw-btn-slight h-[38px] px-3.5 text-sm">+ 계급 추가</button>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">세로(등급)로 쌓고, 각 등급을 가로(세부)로 나눠요. 예: <b className="text-ink2">공작</b> 아래 공작·공작부인·공작영애·공작영식. ▲▼로 등급 순서를 바꿔요.</div>

                  <div className="flex flex-col gap-2.5">
                    {ranks.map((r, i) => (
                      <div key={r.id} className="rounded-md border border-hairline bg-canvas p-2.5">
                        {/* 등급(세로) */}
                        <div className="flex items-center gap-2">
                          <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border border-line2 bg-white text-[12px] font-bold text-muted">{i + 1}</span>
                          <input value={r.name} onChange={(e) => updateRank(r.id, { name: e.target.value })} placeholder="등급 명칭 (예: 공작)" className="h-[38px] w-[130px] flex-shrink-0 rounded border border-line2 bg-white px-2.5 text-sm font-bold text-ink outline-none focus:border-brand" />
                          <input value={r.desc} onChange={(e) => updateRank(r.id, { desc: e.target.value })} placeholder="설명 (선택)" className="h-[38px] min-w-0 flex-1 rounded border border-line2 bg-white px-2.5 text-sm text-ink outline-none focus:border-brand" />
                          <div className="flex flex-shrink-0 flex-col gap-0.5">
                            <button onClick={() => moveRank(r.id, -1)} disabled={i === 0} className={"flex h-4 w-[22px] items-center justify-center rounded-[3px] border border-line2 bg-white text-[8px] " + (i === 0 ? "cursor-default text-[#d8d8d8]" : "text-muted hover:text-brand")}>▲</button>
                            <button onClick={() => moveRank(r.id, 1)} disabled={i === ranks.length - 1} className={"flex h-4 w-[22px] items-center justify-center rounded-[3px] border border-line2 bg-white text-[8px] " + (i === ranks.length - 1 ? "cursor-default text-[#d8d8d8]" : "text-muted hover:text-brand")}>▼</button>
                          </div>
                          <button onClick={() => removeRank(r.id)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[15px] text-muted transition hover:bg-error-wash hover:text-error">×</button>
                        </div>
                        {/* 세부 지위(가로) */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[30px]">
                          <span className="mr-0.5 text-[11px] font-bold text-muted">세부</span>
                          {r.variants.map((v, idx) => (
                            <span key={idx} className="inline-flex h-7 items-center gap-0.5 rounded-full border border-line2 bg-white pl-2.5 pr-1">
                              <input value={v} onChange={(e) => updateVariant(r.id, idx, e.target.value)} placeholder="세부 지위" className="w-[88px] bg-transparent text-[13px] font-bold text-ink outline-none" />
                              <button onClick={() => removeVariant(r.id, idx)} className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-error-wash hover:text-error">×</button>
                            </span>
                          ))}
                          <button onClick={() => addVariant(r.id)} className="h-7 rounded-full border border-dashed border-[#b6a9ff] bg-transparent px-2.5 text-[12px] font-bold text-brand transition hover:bg-wash">+ 세부</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {ranks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-line2 p-[22px] text-center text-[13px] text-muted">계급 체계가 비어 있어요. 추가해 위계를 잡아보세요.</div>
                  )}
                </div>

                {/* 고유명사 사전 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-ink">고유명사 사전</span>
                      <span className="text-[13px] font-bold text-muted">{glossary.length}개</span>
                    </div>
                    <button onClick={addTerm} className="pw-btn-slight h-[38px] px-3.5 text-sm">+ 용어 추가</button>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">등록한 용어는 장편 내내 일관되게 쓰여요.</div>

                  <div className="flex flex-col gap-2.5">
                    {glossary.map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-2.5">
                        <input value={t.term} onChange={(e) => updateTerm(t.id, { term: e.target.value })} placeholder="용어" className="h-11 w-[140px] flex-shrink-0 rounded border border-hairline px-3 text-[15px] font-bold text-ink outline-none focus:border-brand" />
                        <div className="w-32 flex-shrink-0">
                          {t.categoryCustom ? (
                            <input value={t.category} onChange={(e) => updateTerm(t.id, { category: e.target.value })} onBlur={() => { if (!t.category.trim()) updateTerm(t.id, { categoryCustom: false }); }} placeholder="분류" className="h-11 w-full rounded border border-brand px-2.5 text-sm text-ink outline-none" />
                          ) : (
                            <div className="pw-select-wrap">
                              <select value={t.category} onChange={(e) => onTermCat(t.id, e.target.value)} className="pw-select text-sm" style={{ height: 44 }}>
                                <option value="">분류</option>
                                {kit.glossaryCats.map((o) => <option key={o} value={o}>{o}</option>)}
                                <option value="__custom">+ 직접입력</option>
                              </select>
                              <span className="pw-select-caret">▼</span>
                            </div>
                          )}
                        </div>
                        <input value={t.meaning} onChange={(e) => updateTerm(t.id, { meaning: e.target.value })} placeholder="뜻·설명" className="h-11 min-w-[140px] flex-1 rounded border border-hairline px-3 text-[15px] text-ink outline-none focus:border-brand" />
                        <button onClick={() => removeTerm(t.id)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-base text-muted transition hover:bg-error-wash hover:text-error">×</button>
                      </div>
                    ))}
                  </div>
                  {glossary.length === 0 && (
                    <div className="rounded-lg border border-dashed border-line2 p-[22px] text-center text-[13px] text-muted">등록한 용어가 없어요. 필요하면 추가해 보세요.</div>
                  )}
                </div>

                {/* 세계 규칙 · 금기 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-4 text-sm font-bold text-ink">세계 규칙 · 금기</div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr" }}>
                    <div>
                      <div className="mb-2 pw-field-label">세계 규칙</div>
                      <textarea value={worldRules} onChange={(e) => setWorldRules(e.target.value)} placeholder="예: 내공은 단전에 축적된다. 마나는 정령과의 계약으로만 다룰 수 있다." className="min-h-[96px] w-full resize-y rounded border border-hairline bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink outline-none transition focus:border-brand focus:shadow-focus" />
                    </div>
                    <div>
                      <div className="mb-2 pw-field-label">금기 · 제약</div>
                      <textarea value={taboos} onChange={(e) => setTaboos(e.target.value)} placeholder="예: 마교 무공은 정파에 알려지면 안 된다. 황족은 직접 검을 들 수 없다." className="min-h-[96px] w-full resize-y rounded border border-hairline bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink outline-none transition focus:border-brand focus:shadow-focus" />
                    </div>
                  </div>
                </div>

                {/* 능력 · 파워 시스템 */}
                <div className="pw-card mb-4 p-6">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-sm font-bold text-ink">능력 · 파워 시스템</div>
                    <button
                      type="button"
                      onClick={() => patchPS({ enabled: !powerSystem.enabled })}
                      className={"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 " + (powerSystem.enabled ? "bg-brand" : "bg-[#d1d5db]")}
                    >
                      <span className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 " + (powerSystem.enabled ? "translate-x-5" : "translate-x-0")} />
                    </button>
                  </div>
                  <div className="mb-4 text-[13px] text-muted">이 세계의 능력·마법·무공 체계를 정의해요. 등급·규칙이 프롬프트에 반영돼요.</div>
                  {powerSystem.enabled && (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 pw-field-label">등급 체계 <span className="font-normal text-muted">(강→약 순, 쉼표 구분)</span></div>
                        <input
                          value={powerSystem.rankNames}
                          onChange={(e) => patchPS({ rankNames: e.target.value })}
                          placeholder="예: S,A,B,C,D,E — 또는: 신급,성급,지급,현급,황급"
                          className="pw-input text-[15px]"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 pw-field-label">핵심 규칙</div>
                        <textarea
                          value={powerSystem.coreRule}
                          onChange={(e) => patchPS({ coreRule: e.target.value })}
                          placeholder="예: 마나는 감정에 반응한다. 공포를 느낄수록 마력이 폭주한다."
                          className="min-h-[72px] w-full resize-y rounded border border-hairline bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="mb-1.5 pw-field-label">주인공 현재 등급</div>
                          <input
                            value={powerSystem.protagonistRank}
                            onChange={(e) => patchPS({ protagonistRank: e.target.value })}
                            placeholder="예: E등급"
                            className="pw-input text-[15px]"
                          />
                        </div>
                        <div>
                          <div className="mb-1.5 pw-field-label">목표 등급</div>
                          <input
                            value={powerSystem.protagonistGoal}
                            onChange={(e) => patchPS({ protagonistGoal: e.target.value })}
                            placeholder="예: S등급"
                            className="pw-input text-[15px]"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1.5 pw-field-label">한계 · 부작용</div>
                        <input
                          value={powerSystem.limitation}
                          onChange={(e) => patchPS({ limitation: e.target.value })}
                          placeholder="예: 상위 마법 사용 시 수명이 소모된다"
                          className="pw-input text-[15px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ TAB 2 · 월드맵 ============ */}
            {tab === "map" && (
              <div>
                <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
                  <div className="text-sm text-muted">지역을 끌어 배치하고, 클릭해 편집해요. 다른 지역을 이어 클릭하면 <b className="text-ink2">연결(관계)</b>이 생겨요.</div>
                  <button onClick={addRegion} className="pw-btn-slight h-[38px] px-3.5 text-[13px]">+ 지역 추가</button>
                </div>

                <div
                  ref={canvasRef}
                  onClick={() => { if (!movedRef.current) clearMapSel(); }}
                  className="relative w-full overflow-hidden rounded-xl border border-[#ece6d8]"
                  style={{ height: canvasH, background: "#faf7f0", backgroundImage: "radial-gradient(#e4dcc8 1px, transparent 1px)", backgroundSize: "24px 24px" }}
                >
                  {/* 연결 대기 안내 배너 */}
                  {selRegion && (
                    <div className="pointer-events-auto absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand/30 bg-white/95 px-3.5 py-1.5 text-[12.5px] font-bold text-brand shadow-[0_2px_10px_rgba(0,0,0,0.08)]" style={{ whiteSpace: "nowrap" }}>
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
                      <b>{selRegion.name.trim() || "지역"}</b> 선택됨 · 다른 지역을 클릭해 연결
                      <button onClick={(e) => { e.stopPropagation(); setSelectedRegionId(null); }} className="ml-1 text-muted transition hover:text-ink">✕</button>
                    </div>
                  )}

                  {/* edges (svg) — 클릭하면 선택(오른쪽에서 편집), C2와 동일 */}
                  <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" style={{ overflow: "visible" }}>
                    {mapEdges.map((e) => {
                      const a = regions.find((r) => r.id === e.from), b = regions.find((r) => r.id === e.to);
                      if (!a || !b) return null;
                      const selected = e.id === selectedEdgeId;
                      const incident = selectedRegionId != null && (e.from === selectedRegionId || e.to === selectedRegionId);
                      const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
                      return (
                        <g key={e.id}>
                          <path d={d} fill="none" stroke="transparent" strokeWidth={18} onClick={(ev) => { ev.stopPropagation(); selectEdge(e.id); }} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
                          <path d={d} fill="none" stroke={selected ? "#816bff" : incident ? "#a89bff" : "#b9b9c6"} strokeWidth={selected ? 2.6 : 2} strokeDasharray="6 5" style={{ pointerEvents: "none", transition: "stroke .2s ease" }} />
                        </g>
                      );
                    })}
                  </svg>

                  {/* edge labels (클릭 시 선택) */}
                  {mapEdges.map((e) => {
                    const a = regions.find((r) => r.id === e.from), b = regions.find((r) => r.id === e.to);
                    if (!a || !b) return null;
                    const selected = e.id === selectedEdgeId;
                    const lx = (a.x + b.x) / 2, ly = (a.y + b.y) / 2;
                    return (
                      <button
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); selectEdge(e.id); }}
                        className={"absolute z-[2] inline-flex h-6 -translate-x-1/2 -translate-y-1/2 items-center rounded-full px-2.5 text-[12px] font-bold transition-all " + (selected ? "border border-brand bg-brand text-white" : "border border-line2 bg-white text-ink2")}
                        style={{ left: lx, top: ly, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}
                      >
                        {e.label || "연결"}
                      </button>
                    );
                  })}

                  {/* region nodes */}
                  {regions.map((n) => {
                    const sel = n.id === selectedRegionId;
                    const dimmed = selectedRegionId != null && !sel;
                    const col = facColor(n.factionId);
                    return (
                      <div
                        key={n.id}
                        onPointerDown={(e) => { e.preventDefault(); startDrag(e, n.id, n.x, n.y); }}
                        onClick={(e) => { e.stopPropagation(); if (movedRef.current) { movedRef.current = false; return; } onRegionTap(n.id); }}
                        className="absolute z-[2] w-32 cursor-grab select-none"
                        style={{ left: n.x - 64, top: n.y - 26, touchAction: "none", opacity: dimmed ? 0.6 : 1, transition: "opacity .2s ease" }}
                      >
                        <div className="flex flex-col items-start gap-1 rounded-lg border border-hairline bg-white px-3 py-2.5" style={{ borderLeft: `4px solid ${col}`, boxShadow: sel ? "0 0 0 2px #816bff, 0 4px 14px rgba(129,107,255,0.25)" : "0 1px 4px rgba(0,0,0,0.12)", transition: "box-shadow .2s ease" }}>
                          <span className="text-sm font-bold text-ink">{n.name.trim() || "지역"}</span>
                          <span className="inline-flex h-[18px] items-center rounded-full px-2 text-[11px] font-bold text-white" style={{ background: col }}>{facName(n.factionId)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* guide */}
                  {regions.length < 2 && (
                    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                      <div className="text-center text-sm font-bold leading-relaxed text-muted">지역을 2개 이상 추가하면<br />지도와 지역 간 연결을 만들 수 있어요</div>
                    </div>
                  )}

                  {/* 자동 추천 (플로팅) — C2와 동일 위치·스타일 */}
                  {regions.length >= 1 && (
                    mapAutoLoading ? (
                      <button disabled onClick={(e) => e.stopPropagation()} className="absolute bottom-3.5 right-3.5 z-[3] inline-flex h-[40px] items-center gap-2 rounded-full border border-line2 bg-white px-4 text-[13px] font-bold text-brand opacity-80 shadow-[0_3px_12px_rgba(0,0,0,0.12)]" style={{ cursor: "default" }}>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                        추천 중...
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); mapAutoRecommend(); }} className="absolute bottom-3.5 right-3.5 z-[3] inline-flex h-[40px] items-center gap-[7px] rounded-full border border-brand/25 bg-white px-4 text-[13px] font-bold text-brand shadow-[0_3px_12px_rgba(0,0,0,0.12)] transition hover:bg-wash">
                        ✦ 자동 추천
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* DESKTOP nav — 좌측 컬럼 내부(C2와 동일). 탭 전환에도 위치 고정 */}
            {!isMobile && (
              <div className="mt-5 flex items-center justify-between gap-3.5">
                <button onClick={() => navigate("/create")} className="h-14 rounded px-[22px] text-base font-bold text-muted transition hover:bg-wash hover:text-brand">건너뛰기</button>
                <button onClick={() => { saveWorld({ era: eraVal, genres, worldRules, constraints: taboos, glossaryDict: Object.fromEntries(glossary.filter(t => t.term && t.meaning).map(t => [t.term, t.meaning])), worldFactions: factions.map(f => f.name).filter(Boolean), worldRanks: ranks.flatMap(r => [r.name, ...r.variants]).filter(Boolean), worldFactionsData: factions, worldRanksData: ranks, worldRegions: regions, worldMapEdges: mapEdges, powerSystem }); navigate("/create"); }} className="pw-btn-primary h-14 px-7 text-lg">다음: 기본설정 →</button>
              </div>
            )}
          </div>

          {/* RIGHT: 설정→미리보기 / 월드맵→편집 패널 (C2와 동일 셸) */}
          {showPanel && (
            <div className={isDesktop ? "w-[336px] flex-shrink-0" : "w-full"}>
              <div className={showSide ? "sticky top-[88px]" : ""}>
                <div className="pw-card p-[22px]">
                  {tab === "settings" ? (
                    /* ── 세계관 미리보기 ── */
                    <>
                      <div className="mb-1 flex items-center gap-[7px]">
                        <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand" />
                        <span className="text-base font-bold text-ink">세계관 미리보기</span>
                      </div>
                      <div className="mb-[18px] text-[13px] text-muted">정의한 무대가 여기에 모여요.</div>

                      <div className="mb-4">
                        <div className="mb-1.5 text-xs font-bold text-muted">배경 시대</div>
                        <div className="text-[15px] font-bold text-ink">{eraVal || "미선택"}</div>
                      </div>
                      <Divider />
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-bold text-muted">장르 · {genres.length}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {genres.map((g) => <span key={g} className="inline-flex h-7 items-center rounded-full bg-wash px-[11px] text-[13px] font-bold text-brand">{g}</span>)}
                        </div>
                      </div>
                      <Divider />
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-bold text-muted">국가·세력 · {factions.length}</div>
                        {factions.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {factions.map((f) => (
                              <div key={f.id} className="flex items-center justify-between gap-2 rounded border border-hairline px-3 py-2.5">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: f.color }} />
                                  <span className="text-sm font-bold text-ink">{f.name.trim() || "이름 미정"}</span>
                                </span>
                                <span className="whitespace-nowrap text-xs font-bold text-muted">{f.category.trim() || "미분류"}</span>
                              </div>
                            ))}
                          </div>
                        ) : <div className="text-[13px] text-[#b4b4b4]">아직 없음</div>}
                      </div>
                      <Divider />
                      <div className="mb-4">
                        <div className="mb-1.5 text-xs font-bold text-muted">계급 체계</div>
                        <div className={"text-sm font-bold leading-relaxed " + (rankChain.length ? "text-ink" : "text-[#b4b4b4]")}>{rankChain.length ? rankChain.join("  ›  ") : "미정"}</div>
                      </div>
                      <Divider />
                      <div className="flex gap-6">
                        <div>
                          <div className="mb-1.5 text-xs font-bold text-muted">용어</div>
                          <div className={"text-[15px] font-bold " + (glossFilled ? "text-ink" : "text-[#b4b4b4]")}>{glossFilled ? `${glossFilled}개` : "없음"}</div>
                        </div>
                        <div>
                          <div className="mb-1.5 text-xs font-bold text-muted">월드맵</div>
                          <div className={"text-[15px] font-bold " + (regions.length ? "text-ink" : "text-[#b4b4b4]")}>{regions.length ? `${regions.length}곳` : "없음"}</div>
                        </div>
                      </div>
                    </>
                  ) : selEdge ? (
                    /* ── 연결(지역 간 관계) 편집 ── */
                    <>
                      <div className="mb-[18px] text-base font-bold text-ink">연결 편집</div>
                      <div className="mb-[18px] flex items-center justify-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-3">
                        <RegionChip regions={regions} facColor={facColor} id={selEdge.from} />
                        <span className="flex-shrink-0 text-muted">—</span>
                        <RegionChip regions={regions} facColor={facColor} id={selEdge.to} />
                      </div>
                      <div className="mb-[18px]">
                        <HybridSelect label="관계 유형" custom={selEdge.labelCustom} onToggleCustom={() => updateEdge(selEdge.id, { labelCustom: !selEdge.labelCustom })} value={selEdge.label} onChange={(v) => updateEdge(selEdge.id, { label: v })} customPlaceholder="예: 비밀 통로">
                          <option value="">선택</option>
                          {REL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </HybridSelect>
                      </div>
                      <div className="mb-[18px]">
                        <div className="mb-1.5 pw-field-label">설명 <span className="font-normal text-muted">(선택)</span></div>
                        <textarea value={selEdge.desc} onChange={(e) => updateEdge(selEdge.id, { desc: e.target.value })} placeholder="예: 사신을 통해 교역이 오가는 길" className="min-h-[72px] w-full resize-y rounded border border-hairline bg-white px-3 py-2.5 text-[15px] leading-[1.6] text-ink outline-none focus:border-brand" />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => removeEdge(selEdge.id)} className="rounded px-1 py-1.5 text-[13px] font-bold text-muted transition hover:bg-error-wash hover:text-error">× 이 연결 삭제</button>
                      </div>
                    </>
                  ) : selRegion ? (
                    /* ── 지역 편집 ── */
                    <>
                      <div className="mb-[18px] text-base font-bold text-ink">지역 편집</div>
                      <div className="mb-4">
                        <div className="mb-1.5 pw-field-label">지명</div>
                        <input value={selRegion.name} onChange={(e) => updateRegion(selRegion.id, { name: e.target.value })} placeholder="예: 화산" className="pw-input text-[15px]" style={{ height: 46 }} />
                      </div>
                      <div className="mb-4">
                        <div className="mb-1.5 pw-field-label">소속 세력</div>
                        <div className="pw-select-wrap">
                          <select value={selRegion.factionId === "" ? "" : String(selRegion.factionId)} onChange={(e) => updateRegion(selRegion.id, { factionId: e.target.value === "" ? "" : Number(e.target.value) })} className="pw-select text-[15px]" style={{ height: 46 }}>
                            <option value="">무소속·중립</option>
                            {factions.map((f) => <option key={f.id} value={String(f.id)}>{f.name.trim() || "이름 미정"}</option>)}
                          </select>
                          <span className="pw-select-caret">▼</span>
                        </div>
                      </div>
                      <div className="mb-[18px]">
                        <div className="mb-1.5 pw-field-label">설명 <span className="font-normal text-muted">(선택)</span></div>
                        <textarea value={selRegion.desc} onChange={(e) => updateRegion(selRegion.id, { desc: e.target.value })} placeholder="이 지역에 대한 메모" className="min-h-[80px] w-full resize-y rounded border border-hairline bg-white px-3 py-2.5 text-[15px] leading-[1.6] text-ink outline-none focus:border-brand" />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => removeRegion(selRegion.id)} className="rounded px-1 py-1.5 text-[13px] font-bold text-muted transition hover:bg-error-wash hover:text-error">× 이 지역 삭제</button>
                      </div>
                    </>
                  ) : (
                    /* ── 안내(빈 상태) ── */
                    <>
                      <div className="mb-1 text-base font-bold text-ink">지역 · 연결 편집</div>
                      <div className="mt-[18px] rounded-lg border border-dashed border-line2 px-[18px] py-7 text-center text-[13px] leading-relaxed text-muted">
                        지역을 누르면 이름·소속을,<br />연결선을 누르면 지역 간 관계를<br />여기에서 편집해요.<br />
                        <span className="mt-1 inline-block text-[12px]">지역을 클릭한 뒤 다른 지역을 클릭하면 연결돼요. (빈 곳·ESC로 해제)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <button onClick={() => navigate("/create")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-muted">건너뛰기</button>
          <button onClick={() => { saveWorld({ era: eraVal, genres, worldRules, constraints: taboos, glossaryDict: Object.fromEntries(glossary.filter(t => t.term && t.meaning).map(t => [t.term, t.meaning])), worldFactions: factions.map(f => f.name).filter(Boolean), worldRanks: ranks.flatMap(r => [r.name, ...r.variants]).filter(Boolean), worldFactionsData: factions, worldRanksData: ranks, worldRegions: regions, worldMapEdges: mapEdges, powerSystem }); navigate("/create"); }} className="pw-btn-primary h-[54px] flex-1 text-base">다음: 기본설정 →</button>
        </div>
      )}

    </>
  );
}

/* ── 작은 조각들 ───────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"h-[38px] rounded-full px-[22px] text-sm font-bold transition " + (active ? "bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.10)]" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
function RegionChip({ regions, facColor, id }: { regions: Region[]; facColor: (id: number | "") => string; id: number }) {
  const r = regions.find((x) => x.id === id);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line2 bg-white px-2.5 py-1 text-[13px] font-bold text-ink">
      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: facColor(r?.factionId ?? "") }} />
      <span className="truncate">{r?.name.trim() || "지역"}</span>
    </span>
  );
}
function Divider() {
  return <div className="my-4 h-px bg-hairline" />;
}
