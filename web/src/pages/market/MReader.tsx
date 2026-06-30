import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { WorkCard, type Badge } from "@/components/WorkCard";
import { useToast } from "@/components/Toast";
import { getNovel, getChapter, listNovels } from "@/lib/api";

type ThemeKey = "light" | "sepia" | "dark";
type Theme = {
  name: string; bg: string; prose: string; title: string; sub: string;
  bar: string; hairline: string; track: string; swatch: string; swatchBorder: string;
};
const THEMES: Record<ThemeKey, Theme> = {
  light: { name: "밝게", bg: "#ffffff", prose: "#2a2a2a", title: "#121212", sub: "#8a8a8a", bar: "rgba(255,255,255,0.92)", hairline: "#eeeeee", track: "#f0edff", swatch: "#ffffff", swatchBorder: "#d4d4d4" },
  sepia: { name: "세피아", bg: "#f4ecd8", prose: "#4a3f2e", title: "#3a3024", sub: "#9c8c6e", bar: "rgba(244,236,216,0.92)", hairline: "#e0d4ba", track: "#e6d8b8", swatch: "#f4ecd8", swatchBorder: "#cbb98f" },
  dark: { name: "어둡게", bg: "#15131d", prose: "#cfc9da", title: "#f2f0f7", sub: "#8a849a", bar: "rgba(21,19,29,0.92)", hairline: "#2d2838", track: "#2d2838", swatch: "#15131d", swatchBorder: "#4a4458" },
};

type Recommend = { id: string; title: string; author: string; rating: string; price: string; badge: Badge; variant: number; src?: string };

export default function MReader() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: novelId } = useParams<{ id: string }>();
  const location = useLocation();
  const seq = (location.state as { seq?: number } | null)?.seq ?? 1;

  const [theme, setTheme] = useState<ThemeKey>("light");
  const [fontSize, setFontSize] = useState(18);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [novelTitle, setNovelTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [recommend, setRecommend] = useState<Recommend[]>([]);

  useEffect(() => {
    if (!novelId) return;
    setLoading(true);
    setLoadError(false);
    Promise.all([getNovel(novelId), getChapter(novelId, seq)])
      .then(([n, ch]) => {
        setNovelTitle(n.title);
        setGenres(n.settings?.genres ?? []);
        setChapterTitle(`${ch.seq}화`);
        setParagraphs(ch.content.split(/\n+/).filter((p) => p.trim().length > 0));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [novelId, seq]);

  // 추천 작품 — 공개/판매 중인 본인 작품 (현재 작품 제외)
  useEffect(() => {
    listNovels()
      .then((ns) =>
        setRecommend(
          ns
            .filter((n) => n.id !== novelId && (n.status === "selling" || n.status === "public"))
            .map((n, i) => ({
              id: n.id,
              title: n.title,
              author: "",
              rating: "",
              price: "",
              badge: (n.status === "selling" ? "paid" : "free") as Badge,
              variant: i % 8,
              src: n.cover_url ?? undefined,
            }))
        )
      )
      .catch(() => {});
  }, [novelId]);

  const th = THEMES[theme];
  const dark = theme === "dark";
  const fontPct = ((fontSize - 14) / (26 - 14)) * 100;

  const topBtn = { background: "transparent", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "9px 12px", borderRadius: 4, color: th.sub, flexShrink: 0 } as const;
  const navBtn = { flex: 1, height: 46, borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.title } as const;

  const goTo = (targetSeq: number) => navigate(`/read/${novelId}`, { state: { seq: targetSeq } });

  return (
    <div style={{ minHeight: "100vh", background: th.bg, transition: "background .4s ease" }}>
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 px-3" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: th.bar, borderBottom: `1px solid ${th.hairline}`, transition: "background .4s ease" }}>
        <button onClick={() => navigate(`/market/${novelId}`)} style={topBtn}>← 목록</button>
        <div className="min-w-0 text-center">
          <div className="truncate text-[13px] font-bold leading-[1.2]" style={{ color: th.title }}>{novelTitle}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: th.sub }}>{chapterTitle}{genres.length > 0 ? ` · ${genres.join("/")}` : ""}</div>
        </div>
        <button onClick={() => setSettingsOpen((o) => !o)} style={topBtn}>Aa</button>
      </div>

      {/* SETTINGS PANEL */}
      {settingsOpen && (
        <div className="sticky top-14 z-[25] px-5 py-[18px]" style={{ background: dark ? "#1b1825" : "#fafafa", borderBottom: `1px solid ${th.hairline}`, animation: "pw-fade .2s ease" }}>
          <div className="mb-[18px]">
            <div className="mb-[9px] text-xs font-bold" style={{ color: th.sub }}>배경 테마</div>
            <div className="flex gap-2.5">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                const t = THEMES[k];
                const on = theme === k;
                return (
                  <button key={k} onClick={() => setTheme(k)} className="inline-flex h-10 items-center gap-[7px] rounded-full px-3.5 text-[13px] font-bold" style={{ background: dark ? "#211d2c" : "#fff", border: `1.5px solid ${on ? "#816bff" : th.hairline}`, color: th.title, cursor: "pointer" }}>
                    <span className="inline-block h-4 w-4 rounded-full" style={{ background: t.swatch, border: `1px solid ${t.swatchBorder}` }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-[9px] text-xs font-bold" style={{ color: th.sub }}>글자 크기 · {fontSize}px</div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFontSize((s) => Math.max(14, s - 2))} className="h-[38px] rounded px-3.5 text-[13px] font-bold" style={{ border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.title, cursor: "pointer" }}>가−</button>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: th.track }}>
                <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${fontPct}%` }} />
              </div>
              <button onClick={() => setFontSize((s) => Math.min(26, s + 2))} className="h-[38px] rounded px-3.5 text-[13px] font-bold" style={{ border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.title, cursor: "pointer" }}>가＋</button>
            </div>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="mx-auto px-6 pb-[140px] pt-10" style={{ maxWidth: 680 }}>
        {loading ? (
          <div className="space-y-4" style={{ animation: "pw-fade .3s ease" }}>
            <div className="pw-skel mx-auto h-8 w-48 rounded" />
            <div className="pw-skel mx-auto mb-6 h-6 w-32 rounded" />
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="pw-skel h-5 rounded" />)}
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-dashed border-hairline px-6 py-12 text-center" style={{ color: th.sub }}>
            <div className="mb-2 text-base font-bold" style={{ color: th.title }}>회차를 불러올 수 없어요</div>
            <div className="mb-5 text-sm">아직 생성되지 않은 회차거나 로그인이 필요해요.</div>
            <button onClick={() => navigate(`/market/${novelId}`)} className="text-sm font-bold text-brand">← 목록으로 돌아가기</button>
          </div>
        ) : (
          <>
            <div className="mb-9 text-center">
              <div className="text-[13px] font-bold tracking-[2px] text-brand">CHAPTER {String(seq).padStart(2, "0")}</div>
              <h1 className="mt-2.5 text-[26px] font-bold tracking-[-0.5px]" style={{ color: th.title }}>{chapterTitle}</h1>
            </div>

            <div style={{ fontSize, lineHeight: 2, color: th.prose, wordBreak: "keep-all", transition: "color .4s ease" }}>
              {paragraphs.map((p, i) => (
                <p key={i} className="mb-[1.5em] mt-0">{p}</p>
              ))}
            </div>

            <div className="mt-9 text-center text-xs" style={{ color: th.sub }}>이 작품은 AI 보조로 창작되었습니다.</div>

            {/* RECOMMEND */}
            {recommend.length > 0 && (
              <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${th.hairline}` }}>
                <div className="mb-1.5 text-center text-[15px] font-bold" style={{ color: th.title }}>이런 작품은 어때요?</div>
                <div className="mb-[22px] text-center text-[13px]" style={{ color: th.sub }}>다른 작품도 읽어보세요.</div>
                <div className="flex gap-3.5 overflow-x-auto pb-2">
                  {recommend.map((w) => (
                    <WorkCard key={w.id} {...w} onOpen={() => navigate(`/market/${w.id}`)} className="w-[150px] flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 py-3" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: th.bar, borderTop: `1px solid ${th.hairline}`, transition: "background .4s ease" }}>
        <div className="mx-auto flex items-center gap-2.5" style={{ maxWidth: 680 }}>
          <button onClick={() => seq > 1 ? goTo(seq - 1) : showToast("첫 번째 회차예요")} style={navBtn}>‹ 이전</button>
          <button onClick={() => navigate(`/market/${novelId}`)} className="flex-shrink-0 rounded px-4 text-sm font-bold" style={{ height: 46, border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.sub, cursor: "pointer" }}>목록</button>
          <button onClick={() => showToast("응원은 마켓 페이지에서 할 수 있어요")} className="h-[46px] flex-shrink-0 rounded border-none bg-brand px-[18px] text-sm font-bold text-white transition hover:bg-brand-hover">♥ 응원</button>
          <button onClick={() => goTo(seq + 1)} style={navBtn}>다음 ›</button>
        </div>
      </div>
    </div>
  );
}
