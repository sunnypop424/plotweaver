import { useState } from "react";
import { CoverTile } from "../components/CoverTile";
import { Toast, useToast } from "../components/Toast";

const SLIDES = [
  { bg: "linear-gradient(135deg,#f0edff,#e7e1ff)", title: "설정만 넣으면, AI가 웹소설을 완성해요", desc: "시대·장르·인물만 고르면 회차 본문이 자동으로 써져요. 막막한 백지는 없어요." },
  { bg: "linear-gradient(135deg,#1f1b2e,#15131d)", title: "회차별 본문부터 책 표지까지 자동으로", desc: "스타일만 고르면 어울리는 표지가 만들어져요. 마음에 들 때까지 다시 생성할 수 있어요." },
  { bg: "linear-gradient(135deg,#241b33,#15131d)", title: "만든 작품으로 후원·판매까지", desc: "완성한 작품을 마켓에 올리고 후원과 판매로 수익을 만들어요." },
  { bg: "linear-gradient(135deg,#816bff,#6e58ff)", title: "1분이면 첫 작품을 시작할 수 있어요", desc: "준비는 끝났어요. 지금 바로 첫 작품을 만들어볼까요?" },
];

export default function ONBOnboarding() {
  const { toast, showToast } = useToast();
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);

  const cur = SLIDES[idx];
  const last = SLIDES.length - 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {/* faux 작업실 backdrop */}
      <div className="flex h-16 items-center gap-6 border-b border-hairline bg-white px-6 opacity-60">
        <span className="text-xl font-bold tracking-[-0.5px] text-brand">플롯위버</span>
        <span className="text-sm font-bold text-muted">내 작업실</span>
      </div>
      <div className="mx-auto px-6 py-8 opacity-50" style={{ maxWidth: 1080 }}>
        <div className="h-7 w-40 rounded-md bg-[#e6e6e6]" />
        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
          {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded-[10px]" style={{ background: i % 2 ? "#ececec" : "#e6e6e6" }} />)}
        </div>
      </div>

      {/* OVERLAY */}
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{ background: "rgba(18,18,18,0.62)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "pw-fade .25s ease" }}>
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white" style={{ boxShadow: "0 24px 70px rgba(0,0,0,0.4)", animation: "pw-pop .3s ease" }}>
            {/* skip */}
            <button onClick={() => { setOpen(false); showToast("작업실로 이동합니다 (D1)"); }} className="absolute right-4 top-4 z-[5] rounded-full border-none bg-white/70 px-3 py-[7px] text-[13px] font-bold text-muted transition hover:bg-wash hover:text-brand">건너뛰기</button>

            {/* visual stage */}
            <div className="relative flex h-[280px] items-center justify-center overflow-hidden" style={{ background: cur.bg, transition: "background .4s ease" }}>
              {idx === 0 && (
                <div className="w-full px-9" style={{ animation: "pw-rise .4s ease" }}>
                  <div className="mb-[18px] flex flex-wrap justify-center gap-[7px]">
                    {["중세 유럽", "회귀", "복수", "카엘 · 주인공"].map((c) => (
                      <span key={c} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-[0_2px_8px_rgba(0,0,0,0.06)]">{c}</span>
                    ))}
                  </div>
                  <div className="mb-3.5 text-center text-xl text-[#a892ff]">↓</div>
                  <div className="rounded-[10px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]" style={{ background: "#15131d" }}>
                    <div className="mb-[7px] text-[11px] font-bold text-[#a892ff]">✦ 1화. 회귀</div>
                    <div className="text-xs leading-[1.7] text-white/[0.82]">
                      눈을 떴을 때, 카엘은 10년 전으로<br />돌아와 있었다. 처형대의 차가운<br />감촉 대신, 손끝에 닿는 것은
                      <span className="ml-[3px] inline-block h-[13px] w-[7px] align-[-2px] bg-[#a892ff]" style={{ animation: "pw-blink 1s step-end infinite" }} />
                    </div>
                  </div>
                </div>
              )}
              {idx === 1 && (
                <div className="flex items-center gap-4" style={{ animation: "pw-rise .4s ease" }}>
                  <div className="w-24" style={{ animation: "pw-float 3.5s ease-in-out infinite" }}><CoverTile title="회귀한 검" author="지훈" variant={0} rotate={-3} /></div>
                  <div className="w-24 translate-y-3.5" style={{ animation: "pw-float 3.5s ease-in-out infinite .6s" }}><CoverTile title="서리의 군주" author="린" variant={5} rotate={2} /></div>
                  <div className="w-24" style={{ animation: "pw-float 3.5s ease-in-out infinite 1.2s" }}><CoverTile title="별을 삼킨 아이" author="소리" variant={7} rotate={-2} /></div>
                </div>
              )}
              {idx === 2 && (
                <div className="flex flex-col items-center gap-3.5" style={{ animation: "pw-rise .4s ease" }}>
                  <div className="w-[120px]"><CoverTile title="회귀한 검" author="지훈" variant={0} /></div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-brand px-4 py-[7px] text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(129,107,255,0.4)]">₩3,000 판매중</span>
                    <span className="rounded-full bg-white px-4 py-[7px] text-[13px] font-bold text-brand shadow-[0_4px_12px_rgba(0,0,0,0.08)]">♥ 후원 312</span>
                  </div>
                </div>
              )}
              {idx === 3 && (
                <div className="text-center" style={{ animation: "pw-rise .4s ease" }}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-white/40 bg-white/[0.16] text-[34px] text-white">✦</div>
                  <div className="mt-4 text-[15px] font-bold text-white">단 1분이면 충분해요</div>
                </div>
              )}
            </div>

            {/* text + controls */}
            <div className="px-7 pb-6 pt-[26px]">
              <div className="min-h-[96px]">
                <div className="text-xs font-bold tracking-[1px] text-brand">STEP {idx + 1} / {SLIDES.length}</div>
                <div className="mt-2 text-[21px] font-bold leading-[1.35] tracking-[-0.4px] text-ink">{cur.title}</div>
                <div className="mt-2 text-sm leading-[1.6] text-muted">{cur.desc}</div>
              </div>

              {/* dots */}
              <div className="mt-[18px] flex items-center justify-center gap-[7px]">
                {SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} className="h-2 rounded-full border-none p-0 transition-all" style={{ width: i === idx ? 24 : 8, background: i === idx ? "#816bff" : "#d9d3ff", cursor: "pointer" }} />
                ))}
              </div>

              {/* buttons */}
              <div className="mt-5 flex items-center gap-2.5">
                {idx > 0 && (
                  <button onClick={() => setIdx((i) => Math.max(0, i - 1))} className="h-[52px] flex-shrink-0 rounded border border-line2 bg-white px-5 text-[15px] font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">이전</button>
                )}
                {idx < last ? (
                  <button onClick={() => setIdx((i) => Math.min(last, i + 1))} className="h-[52px] flex-1 rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover">다음</button>
                ) : (
                  <button onClick={() => { setOpen(false); showToast("새 작품 만들기로 이동합니다 (위저드 ①)"); }} className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded border-none bg-brand text-base font-bold text-white shadow-cta transition hover:bg-brand-hover">✦ 바로 만들기</button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // reopen (1회성 데모)
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3.5 text-sm text-muted">온보딩은 가입 직후 1회만 표시돼요.</div>
            <button onClick={() => { setOpen(true); setIdx(0); }} className="h-[50px] rounded border-none bg-brand px-6 text-[15px] font-bold text-white" style={{ boxShadow: "0 8px 24px rgba(129,107,255,0.4)" }}>투어 다시 보기</button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
