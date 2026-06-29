import { useEffect, useRef, useState } from "react";
import { CoverTile } from "../components/CoverTile";
import { WorkCard, type Badge } from "../components/WorkCard";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

// TODO: 실제 AI 표지 렌더로 교체 — 각 항목에 src 추가 시 CoverTile이 이미지를 사용
const POOL = [
  { title: "회귀한 검사", author: "지훈", variant: 0 },
  { title: "악녀의 일기", author: "세라", variant: 2 },
  { title: "현대 마법사", author: "도윤", variant: 3 },
  { title: "황혼의 기사단", author: "린", variant: 1 },
  { title: "폐허의 연금술사", author: "하루", variant: 4 },
  { title: "서리의 군주", author: "강", variant: 7 },
  { title: "검은 탑의 연인", author: "유나", variant: 5 },
  { title: "마지막 연금술", author: "서준", variant: 6 },
  { title: "붉은 달의 맹세", author: "한별", variant: 2 },
  { title: "이세계 식당", author: "미오", variant: 1 },
  { title: "그림자 기사", author: "윤", variant: 3 },
  { title: "별을 삼킨 아이", author: "소리", variant: 0 },
];

const WORKS: { title: string; author: string; rating: string; price: string; badge: Badge; variant: number }[] = [
  { title: "회귀한 검사", author: "지훈", rating: "4.8", price: "3,000원", badge: "paid", variant: 0 },
  { title: "악녀의 일기", author: "세라", rating: "4.6", price: "", badge: "free", variant: 2 },
  { title: "현대 마법사", author: "도윤", rating: "4.7", price: "", badge: "tip", variant: 3 },
  { title: "황혼의 기사단", author: "린", rating: "4.9", price: "4,500원", badge: "paid", variant: 1 },
  { title: "폐허의 연금술사", author: "하루", rating: "4.5", price: "", badge: "free", variant: 4 },
];

export default function LLanding() {
  const { vw } = useViewport();
  const { toast, showToast } = useToast();
  const isWide = vw >= 1024;

  const [loadingWorks, setLoadingWorks] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const carRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingWorks(false), 1300);
    return () => window.clearTimeout(t);
  }, []);

  // 스크롤 진입 시 섹션 reveal
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const nav = (label: string) => () => { setMenuOpen(false); showToast(label); };
  const start = nav("가입 화면으로 이동합니다");
  const scrollBy = (dx: number) => carRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  // 히어로 표지월 컬럼 구성
  const colCount = vw < 768 ? 2 : vw < 1024 ? 3 : 5;
  const columns = Array.from({ length: colCount }, (_, c) => {
    const tiles = Array.from({ length: 4 }, (_, r) => {
      const item = POOL[(c * 4 + r) % POOL.length];
      return { ...item, rotate: (((c + r) % 3) - 1) * 2.5 };
    });
    const down = c % 2 === 0;
    const dur = 26 + (c % 4) * 4;
    const offset = c % 2 === 0 ? 0 : -42;
    return { tiles, down, dur, offset };
  });

  const gallery = POOL.slice(0, 8);

  return (
    <div ref={rootRef} className="bg-white">
      {/* NAV (dark glass) */}
      <div className="sticky top-0 z-40 border-b border-white/[0.08]" style={{ background: "rgba(17,15,21,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex h-16 items-center justify-between px-6" style={{ maxWidth: 1180 }}>
          <div className="flex items-center gap-7">
            <span className="text-xl font-bold tracking-[-0.5px] text-white">플롯위버</span>
            {isWide && (
              <div className="flex items-center gap-[22px]">
                <button onClick={nav("창작 스튜디오로 이동합니다")} className="border-none bg-transparent p-1.5 text-sm font-bold text-white/[0.82] transition-colors hover:text-[#a892ff]">창작</button>
                <button onClick={nav("마켓으로 이동합니다")} className="border-none bg-transparent p-1.5 text-sm font-bold text-white/[0.82] transition-colors hover:text-[#a892ff]">마켓</button>
              </div>
            )}
          </div>
          {isWide ? (
            <div className="flex items-center gap-2.5">
              <button onClick={nav("로그인 화면으로 이동합니다")} className="rounded border-none bg-transparent px-3.5 py-2.5 text-sm font-bold text-white/[0.82] transition hover:bg-white/[0.08] hover:text-white">로그인</button>
              <button onClick={start} className="h-[42px] rounded border-none bg-brand px-[18px] text-sm font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 4px 14px rgba(129,107,255,0.4)" }}>무료로 시작</button>
            </div>
          ) : (
            <button onClick={() => setMenuOpen((o) => !o)} className="flex h-[42px] w-[42px] items-center justify-center rounded border-none bg-transparent text-[22px] text-white hover:bg-white/[0.08]">≡</button>
          )}
        </div>
        {menuOpen && !isWide && (
          <div className="flex flex-col gap-1 border-t border-white/[0.08] px-6 pb-4 pt-3" style={{ background: "rgba(17,15,21,0.96)", animation: "pw-fade .2s ease" }}>
            <button onClick={nav("창작 스튜디오로 이동합니다")} className="rounded p-3 text-left text-[15px] font-bold text-white">창작</button>
            <button onClick={nav("마켓으로 이동합니다")} className="rounded p-3 text-left text-[15px] font-bold text-white">마켓</button>
            <div className="my-1.5 h-px bg-white/10" />
            <button onClick={nav("로그인 화면으로 이동합니다")} className="rounded p-3 text-left text-[15px] font-bold text-white/[0.82]">로그인</button>
            <button onClick={start} className="mt-1 h-12 rounded border-none bg-brand text-[15px] font-bold text-white">무료로 시작</button>
          </div>
        )}
      </div>

      {/* HERO — COVER WALL */}
      <div className="relative flex items-center overflow-hidden" style={{ background: "#121212", minHeight: "90vh", marginTop: -64, paddingTop: 64 }}>
        {/* wall */}
        <div className="absolute z-0 flex gap-[18px]" style={{ top: "-7%", left: "-6%", width: "112%", height: "120%" }}>
          {columns.map((col, c) => (
            <div
              key={c}
              className="pw-drift flex min-w-0 flex-1 flex-col gap-[18px]"
              style={{ marginTop: col.offset, animation: `${col.down ? "pw-drift-down" : "pw-drift-up"} ${col.dur}s ease-in-out infinite alternate` }}
            >
              {col.tiles.map((t, r) => (
                <CoverTile key={r} title={t.title} author={t.author} variant={t.variant} rotate={t.rotate} onOpen={() => showToast(`「${t.title}」 미리보기`)} />
              ))}
            </div>
          ))}
        </div>

        {/* scrims */}
        <div className="absolute inset-0 z-[1]" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(18,18,18,0.66) 0%, rgba(18,18,18,0.40) 38%, rgba(17,15,21,0.93) 100%)" }} />
        <div className="absolute inset-0 z-[1]" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 42%, rgba(129,107,255,0.22), rgba(129,107,255,0) 70%)" }} />
        <div className="absolute inset-x-0 bottom-0 z-[1] h-40" style={{ background: "linear-gradient(to bottom, rgba(18,18,18,0) 0%, #ffffff 100%)" }} />

        {/* foreground */}
        <div className="relative z-[2] mx-auto w-full px-6 pb-[72px] pt-12 text-center" style={{ maxWidth: 1180 }}>
          <div className="pw-reveal in mb-[26px] inline-flex items-center gap-[7px] rounded-full px-4 py-2 text-[13px] font-bold" style={{ background: "rgba(129,107,255,0.16)", border: "1px solid rgba(129,107,255,0.35)", color: "#c9bcff", backdropFilter: "blur(4px)" }}>
            ✦ 설정만 넣으면 끝나는 AI 창작 스튜디오
          </div>
          <h1 className="m-0 font-bold" style={{ fontSize: "clamp(40px,6vw,72px)", lineHeight: 1.18, letterSpacing: "-1.5px", color: "#fafafa", textWrap: "balance", textShadow: "0 2px 30px rgba(0,0,0,0.5)" }}>
            당신의 설정이,<br />
            <span style={{ color: "#a892ff" }}>한 편의 웹소설</span>이 됩니다 — 표지까지.
          </h1>
          <p className="mx-auto mt-[22px] max-w-[540px] leading-[1.6] text-white/[0.78]" style={{ fontSize: "clamp(15px,2vw,19px)" }}>
            회차별 본문부터 책 표지까지 자동으로. 만든 작품으로 후원·판매까지 한 곳에서.
          </p>
          <div className="mt-9 flex flex-col items-center gap-[13px]">
            <button onClick={start} className="inline-flex h-[62px] items-center gap-2.5 rounded border-none bg-brand px-9 text-[19px] font-bold text-white transition hover:bg-brand-hover active:translate-y-px" style={{ boxShadow: "0 8px 32px rgba(129,107,255,0.5)" }}>
              ▶ 무료로 시작하기
            </button>
            <span className="text-[13px] text-white/60">신용카드 없이 · 1분이면 첫 작품</span>
          </div>
          <div className="pw-bounce mt-[52px] text-[22px] text-white/[0.45]" style={{ animation: "pw-bounce 1.8s ease-in-out infinite" }}>↓</div>
        </div>
      </div>

      {/* STAT BAND */}
      <div data-reveal className="pw-reveal border-b border-hairline bg-white">
        <div className="mx-auto flex flex-wrap justify-around gap-6 px-6 py-[34px] text-center" style={{ maxWidth: 1000 }}>
          <Stat value={<>12,400<span className="text-brand">+</span></>} label="생성된 작품" />
          <Stat value="★ 4.8" label="평균 별점" />
          <Stat value={<>₩2.3<span className="text-[22px]">억</span></>} label="창작자 누적 정산액" />
        </div>
      </div>

      {/* POPULAR CAROUSEL */}
      <div data-reveal className="pw-reveal mx-auto px-6 py-14" style={{ maxWidth: 1180 }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-[22px] w-1.5 rounded-full bg-brand" />
            <span className="text-[22px] font-bold tracking-[-0.4px] text-ink">지금 인기 작품</span>
          </div>
          {isWide && (
            <div className="flex gap-2">
              <button onClick={() => scrollBy(-440)} className="h-10 w-10 rounded-full border border-line2 bg-white text-base text-ink2 transition hover:bg-wash hover:text-brand">‹</button>
              <button onClick={() => scrollBy(440)} className="h-10 w-10 rounded-full border border-line2 bg-white text-base text-ink2 transition hover:bg-wash hover:text-brand">›</button>
            </div>
          )}
        </div>

        {loadingWorks ? (
          <div className="flex gap-[18px] overflow-hidden">
            {[0, 1, 2, 3].map((i) => <div key={i} className="w-[190px] flex-shrink-0"><div className="pw-skel aspect-[3/4] rounded-lg" style={{ height: "auto" }} /></div>)}
          </div>
        ) : (
          <div ref={carRef} className="pw-scroll flex gap-[18px] overflow-x-auto pb-2.5" style={{ scrollBehavior: "smooth" }}>
            {WORKS.map((w, i) => (
              <WorkCard key={i} {...w} onOpen={() => showToast(`「${w.title}」 판매페이지로 이동합니다`)} className="w-[190px] flex-shrink-0" />
            ))}
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <div className="border-y border-hairline bg-canvas">
        <div data-reveal className="pw-reveal mx-auto px-6 py-[60px]" style={{ maxWidth: 1180 }}>
          <div className="mb-10 text-center">
            <div className="text-[28px] font-bold tracking-[-0.5px] text-ink">설정 하나가, 작품이 되기까지</div>
            <div className="mt-2 text-[15px] text-muted">같은 작품이 단계마다 자라납니다.</div>
          </div>
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {/* step 1 */}
            <StepCard n={1} title="설정 입력" desc="시대·장르·인물만 고르면 끝. 추천값이 채워져 있어요.">
              <div className="flex min-h-[96px] flex-wrap content-start gap-[7px] rounded-lg border border-hairline bg-[#fafafa] p-3.5">
                <Chip>중세 유럽</Chip>
                <Chip accent>회귀</Chip>
                <Chip accent>복수</Chip>
                <Chip>카엘 · 주인공</Chip>
              </div>
            </StepCard>
            {/* step 2 */}
            <StepCard n={2} title="AI 생성" desc="회차별 본문을 자동 집필. 재생성·직접 편집도 자유롭게.">
              <div className="min-h-[96px] rounded-lg p-3.5" style={{ background: "#15131d" }}>
                <div className="mb-2 text-[11px] font-bold text-[#a892ff]">✦ 1화. 회귀</div>
                <div className="text-xs leading-[1.7] text-white/[0.78]">
                  눈을 떴을 때, 카엘은 10년 전으로<br />돌아와 있었다. 처형대의 차가운 감촉<br />대신, 손끝에 닿는 것은
                  <span className="ml-[3px] inline-block h-[14px] w-2 align-[-2px] bg-[#a892ff]" style={{ animation: "pw-blink 1s step-end infinite" }} />
                </div>
              </div>
            </StepCard>
            {/* step 3 */}
            <StepCard n={3} title="표지·판매" desc="책 표지까지 만들고, 마켓에 등록해 수익으로.">
              <div className="flex min-h-[96px] items-center gap-3.5 rounded-lg border border-hairline bg-[#fafafa] p-3.5">
                <div className="w-[62px] flex-shrink-0">
                  <CoverTile title="회귀한 검사" variant={0} rotate={-3} onOpen={() => showToast("「회귀한 검사」 미리보기")} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-ink">「회귀한 검사」</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">3,000원</span>
                    <span className="rounded-full bg-wash px-2.5 py-1 text-[11px] font-bold text-brand">후원</span>
                  </div>
                </div>
              </div>
            </StepCard>
          </div>
        </div>
      </div>

      {/* GALLERY — COVER WALL */}
      <div data-reveal className="pw-reveal mx-auto px-6 py-[60px]" style={{ maxWidth: 1180 }}>
        <div className="mb-9 text-center">
          <div className="text-[28px] font-bold tracking-[-0.5px] text-ink">설정만으로 만들어진 표지들</div>
          <div className="mt-2 text-[15px] text-muted">스타일을 바꾸면 표지도 바뀌어요.</div>
        </div>
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
          {gallery.map((g, i) => (
            <CoverTile key={i} title={g.title} author={g.author} variant={g.variant} onOpen={() => showToast(`「${g.title}」 미리보기`)} />
          ))}
        </div>
      </div>

      {/* PRICING TEASER */}
      <div data-reveal className="pw-reveal mx-auto px-6 pb-16 pt-2" style={{ maxWidth: 1180 }}>
        <div className="relative overflow-hidden rounded-[18px] px-8 py-14 text-center text-white" style={{ background: "linear-gradient(135deg,#816bff 0%,#6e58ff 100%)", boxShadow: "0 20px 60px rgba(129,107,255,0.4)" }}>
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "-40%", width: "60%", height: "120%", background: "radial-gradient(ellipse,rgba(255,255,255,0.18),transparent 70%)" }} />
          <div className="relative">
            <div className="font-bold leading-[1.3] tracking-[-0.6px]" style={{ fontSize: "clamp(26px,4vw,38px)" }}>막막한 백지는 이제 그만.<br />설정만 넣고 시작하세요.</div>
            <div className="mx-auto mt-3.5 max-w-[500px] text-base leading-[1.6] text-white/[0.88]">가입은 무료. 생성한 만큼만 크레딧을 쓰고, 수익은 투명하게 정산받아요.</div>
            <button onClick={start} className="mt-7 h-[58px] rounded border-none bg-white px-8 text-lg font-bold text-brand transition active:translate-y-px" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>▶ 무료로 시작하기</button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-toast text-white">
        <div className="mx-auto flex flex-wrap items-start justify-between gap-6 px-6 py-11" style={{ maxWidth: 1180 }}>
          <div>
            <div className="text-lg font-bold text-white">플롯위버</div>
            <div className="mt-2 max-w-[300px] text-[13px] leading-[1.6] text-white/60">설정만 넣으면 AI가 웹소설과 표지를 완성하는 창작 스튜디오.</div>
          </div>
          <div className="flex flex-wrap gap-10">
            <FooterCol title="서비스" links={["창작", "마켓"]} onClick={(l) => showToast(`${l}으로 이동합니다`)} />
            <FooterCol title="정보" links={["이용약관", "문의하기"]} onClick={() => showToast("준비 중인 페이지예요")} />
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto px-6 py-4 text-xs text-white/50" style={{ maxWidth: 1180 }}>© 2026 플롯위버. All rights reserved.</div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

/* ── 작은 조각들 ───────────────────────────────────────────────────────── */
function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-[34px] font-bold tracking-[-1px] text-ink">{value}</div>
      <div className="mt-1 text-[13px] font-bold text-muted">{label}</div>
    </div>
  );
}

function StepCard({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="pw-card rounded-xl p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-wash text-sm font-bold text-brand">{n}</div>
        <span className="text-base font-bold text-ink">{title}</span>
      </div>
      {children}
      <div className="mt-3 text-[13px] leading-[1.5] text-muted">{desc}</div>
    </div>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={"rounded-full px-2.5 py-[5px] text-xs font-bold " + (accent ? "bg-wash text-brand" : "border border-line2 bg-white text-ink2")}>
      {children}
    </span>
  );
}

function FooterCol({ title, links, onClick }: { title: string; links: string[]; onClick: (l: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-bold text-white/50">{title}</span>
      {links.map((l) => (
        <button key={l} onClick={() => onClick(l)} className="border-none bg-transparent p-0 text-left text-sm text-white/[0.85]">{l}</button>
      ))}
    </div>
  );
}
