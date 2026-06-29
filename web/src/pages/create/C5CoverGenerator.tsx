import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

type Status = "idle" | "loading" | "error";
type Hybrid = { value: string; custom: boolean; text: string };

const STYLE_OPTIONS = ["웹툰풍", "유화풍", "미니멀 타이포", "실사풍", "수묵화", "사이버펑크"];
const TONE_OPTIONS = ["어두운", "밝은", "파스텔"];
const COVER_BG = [
  "linear-gradient(155deg,#3b3550 0%,#15131d 100%)",
  "linear-gradient(155deg,#2a3147 0%,#0f1218 100%)",
  "linear-gradient(155deg,#48283c 0%,#16101a 100%)",
  "linear-gradient(155deg,#1f3942 0%,#0e1417 100%)",
];

export default function C5CoverGenerator() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const genT = useRef<number | undefined>(undefined);

  const [style, setStyle] = useState<Hybrid>({ value: "웹툰풍", custom: false, text: "" });
  const [tone, setTone] = useState<Hybrid>({ value: "어두운", custom: false, text: "" });
  const [title, setTitle] = useState("회귀한 검사");
  const [includeChar, setIncludeChar] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [failMode, setFailMode] = useState(false);

  const generating = status === "loading";
  const showGrid = status === "idle";
  const showError = status === "error";

  const run = () => {
    if (status === "loading") return;
    setStatus("loading");
    setConfirmed(false);
    genT.current = window.setTimeout(() => {
      if (failMode) {
        setStatus("error");
      } else {
        setStatus("idle");
        showToast("표지 후보를 생성했어요");
      }
    }, 1600);
  };

  const canConfirm = showGrid;

  return (
    <div className="min-h-screen bg-canvas">
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white px-[18px]">
        <button onClick={() => navigate("/works/1/edit")} className="pw-btn-ghost h-[38px] flex-shrink-0 px-2.5 text-sm">← 에디터</button>
        <div className="truncate text-base font-bold text-ink">표지 만들기 · 「회귀한 검, 황혼을 베다」</div>
      </div>

      {/* MAIN */}
      <div
        className="mx-auto box-border w-full"
        style={isDesktop ? { display: "flex", gap: 28, alignItems: "flex-start", maxWidth: 1160, padding: "28px 24px 36px" } : { display: "flex", flexDirection: "column", gap: 22, maxWidth: 680, padding: "22px 16px 110px" }}
      >
        {/* OPTIONS */}
        <div className={isDesktop ? "sticky top-[84px] w-[340px] flex-shrink-0" : "w-full"}>
          <div className="rounded-xl border border-hairline bg-white p-[22px]">
            <div className="mb-1 text-lg font-bold text-ink">표지 옵션</div>
            <div className="mb-5 text-[13px] text-muted">설정을 고르고 표지를 생성해 보세요.</div>

            <div className="mb-[18px]">
              <HybridSelect label="스타일" custom={style.custom} onToggleCustom={() => setStyle((s) => ({ ...s, custom: !s.custom }))} value={style.custom ? style.text : style.value} onChange={(v) => setStyle((s) => (s.custom ? { ...s, text: v } : { ...s, value: v }))} customPlaceholder="예: 빈티지 포스터" height={48}>
                {STYLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </HybridSelect>
            </div>

            <div className="mb-[18px]">
              <HybridSelect label="색감" custom={tone.custom} onToggleCustom={() => setTone((s) => ({ ...s, custom: !s.custom }))} value={tone.custom ? tone.text : tone.value} onChange={(v) => setTone((s) => (s.custom ? { ...s, text: v } : { ...s, value: v }))} customPlaceholder="예: 노을빛" height={48}>
                {TONE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </HybridSelect>
            </div>

            <div className="mb-[18px]">
              <div className="mb-1.5 pw-field-label">제목</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="표지에 들어갈 제목" className="pw-input text-[15px]" />
            </div>

            <div className="mb-[22px]">
              <button onClick={() => setIncludeChar((v) => !v)} className="inline-flex items-center gap-2.5 py-1 text-sm font-bold text-ink">
                <span className={"flex h-5 w-5 items-center justify-center rounded text-[13px] leading-none text-white transition-all " + (includeChar ? "border border-brand bg-brand" : "border border-line2 bg-white")}>
                  {includeChar ? "✓" : ""}
                </span>
                인물 포함
              </button>
            </div>

            {/* generate buttons */}
            <div className="flex gap-2">
              {generating ? (
                <button disabled className="pw-btn-disabled h-[52px] flex-1 text-base" style={{ cursor: "default" }}>
                  <span className="inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-muted/40 border-t-muted" />
                  생성 중...
                </button>
              ) : (
                <button onClick={run} className="pw-btn-primary h-[52px] flex-1 text-base">✦ 표지 생성</button>
              )}
              <button onClick={run} className="pw-btn-slight h-[52px] flex-shrink-0 px-4 text-[15px]">↻ 다시</button>
            </div>

            {/* demo result toggle */}
            <div className="mt-[18px] flex items-center gap-2.5 border-t border-hairline pt-4">
              <span className="text-xs font-bold text-muted">데모 결과</span>
              <div className="flex gap-1.5">
                <Seg active={!failMode} onClick={() => setFailMode(false)}>성공</Seg>
                <Seg active={failMode} onClick={() => setFailMode(true)}>실패</Seg>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATES */}
        <div className={isDesktop ? "min-w-0 flex-1" : "w-full"}>
          <div className="mb-3.5 flex items-baseline justify-between">
            <div className="text-lg font-bold text-ink">표지 후보</div>
            {showGrid && <span className="text-[13px] font-bold text-muted">마음에 드는 표지를 선택하세요</span>}
          </div>

          {generating ? (
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="pw-skel aspect-[6/9] rounded-lg" style={{ height: "auto" }} />)}
            </div>
          ) : showError ? (
            <div className="rounded-xl border border-dashed border-[#f3c9c8] bg-[#fdf4f4] px-6 py-10 text-center" style={{ animation: "pw-fade .3s ease" }}>
              <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[26px] font-bold text-error">!</div>
              <div className="text-base font-bold text-ink">표지 생성에 실패했어요</div>
              <div className="mt-2.5 inline-block rounded-full bg-wash px-3 py-1.5 text-sm font-bold text-brand">크레딧은 차감되지 않았어요</div>
              <div className="mt-[18px]">
                <button onClick={run} className="pw-btn-slight h-[46px] px-5 text-[15px]">↻ 다시 시도</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4" style={{ animation: "pw-fade .3s ease" }}>
              {[0, 1, 2, 3].map((i) => {
                const selected = i === selectedIndex;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedIndex(i); setConfirmed(false); }}
                    className="relative block aspect-[6/9] w-full overflow-hidden rounded-lg p-0 transition"
                    style={{
                      background: "#1a1a22",
                      border: `3px solid ${selected ? "#816bff" : "transparent"}`,
                      boxShadow: selected ? "0 6px 18px rgba(129,107,255,0.35)" : "0 2px 8px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div className="absolute inset-0" style={{ background: COVER_BG[i] }} />
                    {includeChar && (
                      <div className="absolute left-1/2 top-[46%] h-[52%] w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)" }} />
                    )}
                    <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-[3px] text-[10px] font-bold text-white backdrop-blur-[2px]">AI 생성</div>
                    <span className="absolute bottom-2 right-2.5 z-[2] text-[11px] font-bold text-white/70">{i + 1}</span>
                    {selected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]">✓</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-4 text-left" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0) 100%)" }}>
                      <div className="text-[17px] font-bold leading-[1.3] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{title}</div>
                      <div className="mt-[5px] text-[11px] text-white/[0.78]">글 · 지훈</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM / SHARE BAR (desktop) */}
      {!isMobile && (
        <div className="border-t border-hairline bg-white">
          <div className="mx-auto flex items-center justify-between gap-3 px-6 py-4" style={{ maxWidth: 1160 }}>
            {confirmed ? (
              <span className="text-sm font-bold text-brand">표지가 확정됐어요. 자랑할 시간이에요!</span>
            ) : (
              <span className="text-[13px] text-muted">{canConfirm ? `${selectedIndex + 1}번 표지를 선택했어요` : "후보를 선택하면 확정할 수 있어요"}</span>
            )}
            <div className="flex flex-shrink-0 gap-2.5">
              {confirmed ? (
                <>
                  <button onClick={() => setConfirmed(false)} className="pw-btn-slight h-[54px] px-[18px] text-[15px]">표지 변경</button>
                  <button onClick={() => showToast("공유 링크를 복사했어요")} className="pw-btn-primary h-[54px] px-7 text-[17px] shadow-cta">↗ 공유하기</button>
                </>
              ) : (
                <button
                  disabled={!canConfirm}
                  onClick={() => { setConfirmed(true); showToast("표지가 확정됐어요"); }}
                  className={(canConfirm ? "pw-btn-primary shadow-cta" : "pw-btn-disabled") + " h-14 px-[30px] text-lg"}
                >
                  이 표지로 확정
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          {confirmed ? (
            <button onClick={() => showToast("공유 링크를 복사했어요")} className="pw-btn-primary h-[52px] w-full text-base">↗ 공유하기</button>
          ) : (
            <button
              disabled={!canConfirm}
              onClick={() => { setConfirmed(true); showToast("표지가 확정됐어요"); }}
              className={(canConfirm ? "pw-btn-primary" : "pw-btn-disabled") + " h-[52px] w-full text-base"}
            >
              이 표지로 확정
            </button>
          )}
        </div>
      )}

    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={"h-8 rounded-full border px-3.5 text-[13px] font-bold transition-all " + (active ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}
    >
      {children}
    </button>
  );
}
