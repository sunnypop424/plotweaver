import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { NovelSettings } from "@/lib/api";

/* ── C0 세계관 전체 객체 타입 (뒤로가기 복원용) ─────────────────────────── */
export type WFaction  = { id: number; name: string; color: string; category: string; categoryCustom: boolean; leader: string; parentId: string; desc: string };
export type WRank     = { id: number; name: string; desc: string; variants: string[] };
export type WRegion   = { id: number; name: string; factionId: number | ""; desc: string; x: number; y: number };
export type WMapEdge  = { id: number; from: number; to: number; label: string; labelCustom: boolean; desc: string };

type WizardState = NovelSettings & {
  novelId: string | null;
  chapterContent: string | null;
  editingNovelId: string | null;  // null=생성 모드, 값=편집 모드
  // C0 full objects for back-navigation restoration
  worldFactionsData: WFaction[];
  worldRanksData: WRank[];
  worldRegions: WRegion[];
  worldMapEdges: WMapEdge[];
};

const DEFAULT: WizardState = {
  era: "",
  genres: [],
  worldRules: "",
  constraints: "",
  glossaryDict: {},
  worldFactions: [],
  worldRanks: [],
  worldFactionsData: [],
  worldRanksData: [],
  worldRegions: [],
  worldMapEdges: [],
  powerSystem: { enabled: false, rankNames: "", coreRule: "", protagonistRank: "", protagonistGoal: "", limitation: "" },
  characters: [],
  goal: "",
  conflict: "",
  storyFlow: { "발단": "", "전개": "", "위기": "", "절정": "" },
  ending: "",
  emotionalGoal: "",
  referenceWork: "",
  cliffhangerStyle: "",
  foreshadowing: [],
  chapterRhythm: {},
  relationships: [],
  pov: "3인칭 전지적",
  totalChapters: 30,
  length: "보통 (4천자)",
  title: "",
  ageRating: "all",
  tone: "간결·속도감",
  coverStyle: "웹툰풍",
  unit: "1회차씩",
  novelId: null,
  chapterContent: null,
  editingNovelId: null,
};

const DRAFT_KEY = "pw_wizard_draft";
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NOVEL_ID_KEY = "pw_novel_id";
const EDITING_ID_KEY = "pw_editing_novel_id";

function saveDraft(data: WizardState) {
  try {
    // novelId / chapterContent / editingNovelId는 세션 임시값 — draft에 포함하지 않음
    const { novelId: _n, chapterContent: _c, editingNovelId: _e, ...rest } = data;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: rest, savedAt: Date.now() }));
  } catch {}
}

function loadDraft(): WizardState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: WizardState; savedAt: number };
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) { localStorage.removeItem(DRAFT_KEY); return null; }
    if (!parsed.data.era && !parsed.data.goal && !parsed.data.characters?.length) return null;
    return { ...DEFAULT, ...parsed.data }; // merge with DEFAULT to fill new fields
  } catch { return null; }
}

function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

function loadNovelId() { try { return sessionStorage.getItem(NOVEL_ID_KEY); } catch { return null; } }
function saveNovelId(id: string) { try { sessionStorage.setItem(NOVEL_ID_KEY, id); } catch {} }
function clearNovelId() { try { sessionStorage.removeItem(NOVEL_ID_KEY); } catch {} }

function loadEditingId() { try { return sessionStorage.getItem(EDITING_ID_KEY); } catch { return null; } }
function saveEditingId(id: string) { try { sessionStorage.setItem(EDITING_ID_KEY, id); } catch {} }
function clearEditingId() { try { sessionStorage.removeItem(EDITING_ID_KEY); } catch {} }

type SaveWorldPayload = Pick<WizardState,
  "era" | "genres" | "worldRules" | "constraints" | "glossaryDict" |
  "worldFactions" | "worldRanks" |
  "worldFactionsData" | "worldRanksData" | "worldRegions" | "worldMapEdges" |
  "powerSystem"
>;

interface WizardContextValue {
  data: WizardState;
  hasDraft: boolean;
  restoreDraft: () => void;
  discardDraft: () => void;
  saveWorld: (d: SaveWorldPayload) => void;
  saveCharacters: (characters: WizardState["characters"]) => void;
  saveNarrative: (d: Pick<WizardState, "goal" | "conflict" | "storyFlow" | "ending" | "emotionalGoal" | "referenceWork" | "cliffhangerStyle" | "foreshadowing" | "chapterRhythm">) => void;
  saveRelations: (relationships: WizardState["relationships"]) => void;
  saveOutput: (d: Pick<WizardState, "pov" | "totalChapters" | "length" | "title" | "ageRating" | "tone" | "coverStyle" | "unit">) => void;
  setNovelId: (id: string) => void;
  setChapterContent: (text: string) => void;
  reset: () => void;
  loadFromNovel: (novelId: string, settings: NovelSettings) => void;
  clearEditMode: () => void;
}

const WizardContext = createContext<WizardContextValue>({
  data: DEFAULT, hasDraft: false,
  restoreDraft: () => {}, discardDraft: () => {},
  saveWorld: () => {}, saveCharacters: () => {}, saveNarrative: () => {},
  saveRelations: () => {}, saveOutput: () => {},
  setNovelId: () => {}, setChapterContent: () => {}, reset: () => {},
  loadFromNovel: () => {}, clearEditMode: () => {},
});

export function WizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardState>(() => ({
    ...DEFAULT,
    novelId: loadNovelId(),
    editingNovelId: loadEditingId(),
  }));
  const [pendingDraft, setPendingDraft] = useState<WizardState | null>(() => loadDraft());

  const hasDraft = pendingDraft !== null;

  // 편집 모드일 때는 draft 자동저장 비활성화
  useEffect(() => {
    if (data.editingNovelId) return;
    if (!data.era && !data.goal && !data.characters?.length) return;
    const t = window.setTimeout(() => saveDraft(data), 600);
    return () => window.clearTimeout(t);
  }, [data]);

  const merge = useCallback((patch: Partial<WizardState>) => setData((d) => ({ ...d, ...patch })), []);

  const restoreDraft = () => {
    if (pendingDraft) { setData(pendingDraft); setPendingDraft(null); clearDraft(); }
  };
  const discardDraft = () => { clearDraft(); setPendingDraft(null); };

  const loadFromNovel = useCallback((novelId: string, settings: NovelSettings) => {
    // 기존 draft 삭제 (편집 시작 시 충돌 방지)
    clearDraft();
    setPendingDraft(null);

    // DB settings를 DEFAULT에 merge — 누락 필드는 DEFAULT로 채움
    const merged: WizardState = {
      ...DEFAULT,
      era: settings.era ?? DEFAULT.era,
      genres: settings.genres ?? DEFAULT.genres,
      worldRules: settings.worldRules ?? DEFAULT.worldRules,
      constraints: settings.constraints ?? DEFAULT.constraints,
      glossaryDict: settings.glossaryDict ?? DEFAULT.glossaryDict,
      worldFactions: settings.worldFactions ?? DEFAULT.worldFactions,
      worldRanks: settings.worldRanks ?? DEFAULT.worldRanks,
      characters: settings.characters ?? DEFAULT.characters,
      goal: settings.goal ?? DEFAULT.goal,
      conflict: settings.conflict ?? DEFAULT.conflict,
      storyFlow: settings.storyFlow ?? DEFAULT.storyFlow,
      ending: settings.ending ?? DEFAULT.ending,
      emotionalGoal: settings.emotionalGoal ?? DEFAULT.emotionalGoal,
      referenceWork: settings.referenceWork ?? DEFAULT.referenceWork,
      cliffhangerStyle: settings.cliffhangerStyle ?? DEFAULT.cliffhangerStyle,
      foreshadowing: settings.foreshadowing ?? DEFAULT.foreshadowing,
      chapterRhythm: settings.chapterRhythm ?? DEFAULT.chapterRhythm,
      powerSystem: settings.powerSystem ?? DEFAULT.powerSystem,
      relationships: settings.relationships ?? DEFAULT.relationships,
      pov: settings.pov ?? DEFAULT.pov,
      totalChapters: settings.totalChapters ?? DEFAULT.totalChapters,
      length: settings.length ?? DEFAULT.length,
      title: settings.title ?? DEFAULT.title,
      ageRating: settings.ageRating ?? DEFAULT.ageRating,
      tone: settings.tone ?? DEFAULT.tone,
      coverStyle: settings.coverStyle ?? DEFAULT.coverStyle,
      unit: settings.unit ?? DEFAULT.unit,
      paragraphLength: settings.paragraphLength,
      // C0 full objects: DB에 저장되지 않으므로 빈 배열 (편집 시 AI 재생성 가능)
      worldFactionsData: [],
      worldRanksData: [],
      worldRegions: [],
      worldMapEdges: [],
      novelId: null,
      chapterContent: null,
      editingNovelId: novelId,
    };
    setData(merged);
    saveEditingId(novelId);
  }, []);

  const clearEditMode = useCallback(() => {
    clearEditingId();
    merge({ editingNovelId: null });
  }, [merge]);

  return (
    <WizardContext.Provider value={{
      data,
      hasDraft,
      restoreDraft,
      discardDraft,
      saveWorld: (d) => merge(d),
      saveCharacters: (characters) => merge({ characters }),
      saveNarrative: (d) => merge(d),
      saveRelations: (relationships) => merge({ relationships }),
      saveOutput: (d) => merge(d),
      setNovelId: (id) => { saveNovelId(id); merge({ novelId: id }); },
      setChapterContent: (text) => merge({ chapterContent: text }),
      reset: () => { clearNovelId(); clearEditingId(); clearDraft(); setData(DEFAULT); },
      loadFromNovel,
      clearEditMode,
    }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() { return useContext(WizardContext); }
