import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkCard, type Badge } from "@/components/WorkCard";
import { useToast } from "@/components/Toast";

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

const RECOMMEND: { title: string; author: string; rating: string; price: string; badge: Badge; variant: number }[] = [
  { title: "서리의 군주", author: "강", rating: "4.6", price: "2,500원", badge: "paid", variant: 5 },
  { title: "검은 탑의 연인", author: "유나", rating: "4.5", price: "", badge: "free", variant: 6 },
  { title: "별을 삼킨 아이", author: "소리", rating: "4.7", price: "3,500원", badge: "paid", variant: 7 },
];

const CHAPTER_TITLE = "5화. 되돌아온 새벽";

type Mode = "read" | "paywall" | "end";

export default function MReader() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [fontSize, setFontSize] = useState(18);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("read");

  const th = THEMES[theme];
  const dark = theme === "dark";
  const fontPct = ((fontSize - 14) / (26 - 14)) * 100;

  const topBtn = { background: "transparent", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "9px 12px", borderRadius: 4, color: th.sub, flexShrink: 0 } as const;
  const navBtn = { flex: 1, height: 46, borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.title } as const;

  return (
    <div style={{ minHeight: "100vh", background: th.bg, transition: "background .4s ease" }}>
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 px-3" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: th.bar, borderBottom: `1px solid ${th.hairline}`, transition: "background .4s ease" }}>
        <button onClick={() => navigate("/market/1")} style={topBtn}>← 목록</button>
        <div className="min-w-0 text-center">
          <div className="truncate text-[13px] font-bold leading-[1.2]" style={{ color: th.title }}>회귀한 검, 황혼을 베다</div>
          <div className="mt-0.5 text-[11px]" style={{ color: th.sub }}>{CHAPTER_TITLE} · 회귀/복수</div>
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
        <div className="mb-9 text-center">
          <div className="text-[13px] font-bold tracking-[2px] text-brand">CHAPTER 05</div>
          <h1 className="mt-2.5 text-[26px] font-bold tracking-[-0.5px]" style={{ color: th.title }}>{CHAPTER_TITLE}</h1>
        </div>

        <div style={{ fontSize, lineHeight: 2, color: th.prose, wordBreak: "keep-all", transition: "color .4s ease" }}>
          <p className="mb-[1.5em] mt-0">눈을 떴을 때, 카엘은 10년 전으로 돌아와 있었다. 처형대의 차가운 감촉 대신, 손끝에 닿는 것은 낡은 침상의 거친 천이었다. 창밖으로는 아직 무너지지 않은 가문의 첨탑이 새벽빛을 받아 희미하게 빛났다.</p>
          <p className="mb-[1.5em] mt-0">그는 천천히 자신의 손을 내려다보았다. 굳은살도, 검을 쥐며 생긴 흉터도 없는—아직 아무것도 잃지 않은 자의 손이었다. 심장이 거칠게 뛰었다. 분노도, 후회도 아닌, 오직 한 가지 확신만이 차올랐다.</p>
          <p className="mb-[1.5em] mt-0">'이번엔, 다르다.'</p>
          <p className="mb-[1.5em] mt-0">배신자들의 얼굴이 하나씩 스쳐 지나갔다. 그를 형제라 불렀던 자, 충성을 맹세했던 기사, 그리고 마지막 순간까지 미소 짓던 그 사람. 카엘은 눈을 감았다. 복수가 아니었다. 그것은 바로잡음이었다. 같은 비극이 반복되기 전에, 황혼이 내리기 전에.</p>
          <p className="mb-[1.5em] mt-0">문 밖에서 익숙한 발소리가 들렸다. 10년 전 오늘, 그를 찾아왔던 단 한 사람. 카엘은 천천히 몸을 일으켰다. 이번 생에서 가장 먼저 만나야 할 사람이, 문 너머에 서 있었다.</p>
        </div>

        <div className="mt-9 text-center text-xs" style={{ color: th.sub }}>이 작품은 AI 보조로 창작되었습니다.</div>

        {/* PAYWALL */}
        {mode === "paywall" && (
          <div className="relative -mt-[120px] pt-[120px]" style={{ background: `linear-gradient(to bottom, ${dark ? "rgba(21,19,29,0)" : "rgba(255,255,255,0)"} 0%, ${th.bg} 38%)` }}>
            <div className="rounded-2xl border border-hairline bg-white px-6 py-8 text-center" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
              <div className="mx-auto mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-wash text-xl text-brand">🔒</div>
              <div className="text-lg font-bold text-ink">무료 미리보기가 끝났어요</div>
              <div className="mt-2 text-sm leading-[1.6] text-muted">이어서 읽으려면 작품을 구매하거나<br />작가를 응원하면 다음 회차를 받을 수 있어요.</div>
              <button onClick={() => { setMode("read"); showToast("구매 완료! 이어서 읽을 수 있어요"); }} className="mt-5 h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 4px 14px rgba(129,107,255,0.32)" }}>전체 구매하기 · 3,000원</button>
              <button onClick={() => navigate("/tip")} className="mt-2.5 h-12 w-full rounded border border-brand bg-white text-[15px] font-bold text-brand transition hover:bg-wash">♥ 응원하고 다음 화 보기</button>
            </div>
          </div>
        )}

        {/* END → RECOMMEND */}
        {mode === "end" && (
          <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${th.hairline}` }}>
            <div className="mb-1.5 text-center text-[15px] font-bold" style={{ color: th.title }}>마지막 회차예요 🎉</div>
            <div className="mb-[22px] text-center text-[13px]" style={{ color: th.sub }}>이 작품을 재미있게 읽었다면, 이런 작품은 어때요?</div>
            <div className="flex gap-3.5 overflow-x-auto pb-2">
              {RECOMMEND.map((w, i) => (
                <WorkCard key={i} {...w} onOpen={() => navigate("/market/1")} className="w-[150px] flex-shrink-0" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 py-3" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: th.bar, borderTop: `1px solid ${th.hairline}`, transition: "background .4s ease" }}>
        <div className="mx-auto flex items-center gap-2.5" style={{ maxWidth: 680 }}>
          <button onClick={() => showToast("이전 회차")} style={navBtn}>‹ 이전</button>
          <button onClick={() => showToast("회차 목록")} className="flex-shrink-0 rounded px-4 text-sm font-bold" style={{ height: 46, border: `1px solid ${th.hairline}`, background: dark ? "#211d2c" : "#fff", color: th.sub, cursor: "pointer" }}>목록</button>
          <button onClick={() => navigate("/tip")} className="h-[46px] flex-shrink-0 rounded border-none bg-brand px-[18px] text-sm font-bold text-white transition hover:bg-brand-hover">♥ 응원</button>
          <button onClick={() => showToast("다음 회차")} style={navBtn}>다음 ›</button>
        </div>
      </div>

      {/* demo switcher */}
      <div className="fixed right-4 top-[72px] z-50 flex flex-col gap-1 rounded-xl border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
        <DemoSeg active={mode === "read"} onClick={() => setMode("read")}>읽기</DemoSeg>
        <DemoSeg active={mode === "paywall"} onClick={() => setMode("paywall")}>페이월</DemoSeg>
        <DemoSeg active={mode === "end"} onClick={() => setMode("end")}>완결</DemoSeg>
      </div>

    </div>
  );
}

function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-3 py-[7px] text-xs font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
