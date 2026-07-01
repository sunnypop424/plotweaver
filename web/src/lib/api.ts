/**
 * FastAPI 백엔드 호출 헬퍼
 * 모든 요청에 Supabase JWT를 자동으로 첨부한다.
 */
import { supabase } from "./supabase";

// VITE_API_URL이 있으면 그걸 쓰고, 없으면 접속한 호스트 기준으로 백엔드를 찾는다.
// (폰에서 192.168.x.x로 접속하면 백엔드도 같은 IP:8002로 자동 연결)
const BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8002`;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "서버 오류");
  }
  return res.json();
}

// ── 작품 ──────────────────────────────────────────────────────────────
export interface NovelSettings {
  era: string;
  genres: string[];
  worldRules: string;
  constraints: string;
  glossaryDict: Record<string, string>;
  worldFactions: string[];
  worldRanks: string[];
  characters: {
    name: string;
    gender?: string;
    faction?: string;
    factionCustom?: boolean;
    rank?: string;
    rankCustom?: boolean;
    status?: string;
    statusCustom?: boolean;
    birth?: string;
    birthUnknown?: boolean;
    appearance: string;
    appearanceCustom?: boolean;
    trait: string;
    bodyCustom?: boolean;
    personality: string;
    personalityCustom?: boolean;
    role: string;
    autoAdded?: boolean;
    // 심리 프로필
    desire?: string;
    fear?: string;
    mannerism?: string;
    secret?: string;
  }[];
  goal: string;
  conflict: string;
  storyFlow: { 발단: string; 전개: string; 위기: string; 절정: string };
  ending: string;
  // 감정 목표 & 레퍼런스
  emotionalGoal?: string;
  referenceWork?: string;
  cliffhangerStyle?: string;
  // 복선 계획
  foreshadowing?: { hint: string; revealChapter: number }[];
  // 회차 패턴
  chapterRhythm?: { eventEveryN?: string; maxOpenThreads?: string; note?: string };
  // 파워/능력 시스템
  powerSystem?: {
    enabled: boolean;
    rankNames: string;
    coreRule: string;
    protagonistRank: string;
    protagonistGoal: string;
    limitation: string;
  };
  relationships: {
    fromChar: string;
    toChar: string;
    relation?: string;
    direction: "both" | "one";
    timeline: { ep: number; fromLabel: string; toLabel: string }[];
  }[];
  pov: string;
  totalChapters: number;
  length: string;
  title: string;
  ageRating: string;
  tone: string;
  coverStyle: string;
  coverTone?: string;
  unit?: string;
  paragraphLength?: string;
}

export function createNovel(title: string, settings: NovelSettings) {
  return request<{ id: string; title: string }>("POST", "/api/novels/", { title, settings });
}

export function listNovels() {
  return request<{ id: string; title: string; status: string; created_at: string; cover_url: string | null; done_chapters: number; total_chapters: number }[]>(
    "GET", "/api/novels/"
  );
}

export function updateNovel(novelId: string, patch: { status?: string; title?: string; settings?: Partial<NovelSettings> }) {
  return request<{ id: string; title: string; status: string }>("PATCH", `/api/novels/${novelId}`, patch);
}

export function deleteNovel(novelId: string) {
  return request<{ deleted: boolean }>("DELETE", `/api/novels/${novelId}`);
}

export function listChapters(novelId: string) {
  return request<{ seq: number; content: string; created_at: string }[]>("GET", `/api/novels/${novelId}/chapters`);
}

export function getNovel(novelId: string) {
  return request<{ id: string; title: string; status: string; settings: NovelSettings; cover_url: string | null }>(
    "GET", `/api/novels/${novelId}`
  );
}

// ── 생성 ──────────────────────────────────────────────────────────────
export function generateChapter(novelId: string, seq = 1, userNote?: string) {
  return request<{ seq: number; content: string; word_count: number }>(
    "POST", `/api/novels/${novelId}/chapters`, { seq, user_note: userNote || undefined }
  );
}

export function generateCover(novelId: string, opts?: { includeTitle?: boolean; includeAuthor?: boolean; includeChar?: boolean; featuredCharNames?: string[]; authorName?: string; count?: number; extraPrompt?: string; refImages?: string[] }) {
  return request<{ cover_url: string; cover_urls: string[] }>("POST", `/api/novels/${novelId}/cover`, { count: 4, ...opts });
}

export function updateCoverUrl(novelId: string, coverUrl: string) {
  return request<{ id: string }>("PATCH", `/api/novels/${novelId}`, { cover_url: coverUrl });
}

export function getChapter(novelId: string, seq: number) {
  return request<{ seq: number; content: string }>(
    "GET", `/api/novels/${novelId}/chapters/${seq}`
  );
}

// ── AI 자동완성 제안 ────────────────────────────────────────────────────
export interface WorldSuggestion {
  factions: { name: string; category: string; leader: string; color: string; desc: string; costume: string; categoryCustom: boolean; parentId: string; parentIndex: number }[];
  ranks: { name: string; desc: string; variants: string[] }[];
  glossary: { term: string; category: string; meaning: string; categoryCustom: boolean }[];
  worldRules: string;
  taboos: string;
  regions: { name: string; factionIndex: number; desc: string; x: number; y: number }[];
  mapEdges: { fromIndex: number; toIndex: number; label: string; desc: string }[];
}

export interface RelationsSuggestion {
  edges: {
    fromIndex: number; toIndex: number;
    relation: string; direction: "both" | "one";
    timeline: { ep: number; fromLabel: string; toLabel: string }[];
  }[];
}

export function suggestWorld(params: { era: string; genres: string[]; synopsis: string; worldRules: string; factionCats?: string[]; factionCount?: number; rankCount?: number; glossaryCount?: number }) {
  return request<WorldSuggestion>("POST", "/api/suggest/world", params);
}

export function suggestRelations(params: { characters: NovelSettings["characters"]; goal: string; conflict: string; totalChapters: number; storyFlow?: { 발단: string; 전개: string; 위기: string; 절정: string }; prompt?: string; existingEdges?: RelationsSuggestion["edges"]; worldRules?: string; factionRelations?: { fromFaction: string; toFaction: string; relation: string }[] }) {
  return request<RelationsSuggestion>("POST", "/api/suggest/relations", params);
}

export interface CharactersSuggestion {
  characters: { name: string; gender: string; age?: number; status?: string; faction: string; rank: string; appearance: string; trait?: string; personality: string; role: "protagonist" | "supporting" | "villain"; desc: string }[];
}

export function suggestCharacters(params: { era: string; genres: string[]; worldFactions: string[]; worldRanks: string[]; worldRules: string; count?: number }) {
  return request<CharactersSuggestion>("POST", "/api/suggest/characters", params);
}

export interface NarrativeSuggestion {
  ki: string; seung: string; jeon: string; gyeol: string;
}

export function suggestNarrative(params: { era: string; genres: string[]; goal: string; conflict: string; ending?: string; emotionalGoal?: string; referenceWork?: string; synopsis?: string; characters: { name: string; role: string; personality?: string }[]; worldRules?: string; relationships?: { fromChar: string; toChar: string; relation: string }[]; foreshadowing?: { hint: string; revealChapter: number }[]; chapterRhythm?: { eventEveryN?: string; maxOpenThreads?: string; note?: string } }) {
  return request<NarrativeSuggestion>("POST", "/api/suggest/narrative", params);
}

export function updateChapter(novelId: string, seq: number, content: string) {
  return request<{ ok: boolean }>("PUT", `/api/novels/${novelId}/chapters/${seq}`, { content });
}

export function suggestTitle(params: { era: string; genres: string[]; goal: string; conflict: string; characters: NovelSettings["characters"]; pov: string; ending: string; worldFactions?: string[]; relationships?: { fromChar: string; toChar: string; relation: string }[]; emotionalGoal?: string; referenceWork?: string; cliffhangerStyle?: string }) {
  return request<{ titles: string[] }>("POST", "/api/suggest/title", params);
}

export interface ReviewIssue {
  type: string;
  severity: "error" | "warning" | "info";
  text: string;
  quote: string;
  suggestion?: string;
}

export interface ReviewResult {
  ok: boolean;
  summary: string;
  issues: ReviewIssue[];
}

export function reviewChapter(novelId: string, seq: number, content: string) {
  return request<ReviewResult>("POST", "/api/suggest/review", { novelId, seq, content });
}
