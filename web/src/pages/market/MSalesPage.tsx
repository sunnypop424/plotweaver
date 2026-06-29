import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoverTile } from "@/components/CoverTile";
import { WorkCard, type Badge } from "@/components/WorkCard";
import { TipModal } from "@/components/TipModal";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

type Mode = "sale" | "purchased" | "gate" | "sold";

const DIST = [
  { star: 5, pct: 78 }, { star: 4, pct: 15 }, { star: 3, pct: 5 }, { star: 2, pct: 1 }, { star: 1, pct: 1 },
];
const REVIEWS = [
  { name: "책벌레김", initial: "책", stars: "★★★★★", text: "회귀물 좋아하면 무조건. 카엘 서사가 촘촘하고 사이다 타이밍이 완벽해요." },
  { name: "심야독자", initial: "심", stars: "★★★★★", text: "AI 보조작인데 문장이 어색하지 않아서 놀랐어요. 표지도 진짜 예쁨." },
  { name: "복수극매니아", initial: "복", stars: "★★★★☆", text: "중반부 전개가 조금 빠른 느낌이지만 전체적으로 만족. 완결까지 정주행했네요." },
];
const OTHER: { title: string; author: string; rating: string; price: string; badge: Badge; variant: number }[] = [
  { title: "서리의 군주", author: "지훈", rating: "4.6", price: "2,500원", badge: "paid", variant: 5 },
  { title: "검은 탑의 연인", author: "지훈", rating: "4.5", price: "", badge: "free", variant: 6 },
  { title: "별을 삼킨 아이", author: "지훈", rating: "4.7", price: "3,500원", badge: "paid", variant: 7 },
  { title: "폐허의 연금술사", author: "지훈", rating: "4.4", price: "", badge: "tip", variant: 4 },
];

export default function MSalesPage() {
  const { vw } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isWide = vw >= 768;

  const [mode, setMode] = useState<Mode>("sale");
  const [tipOpen, setTipOpen] = useState(false);

  const gated = mode === "gate";

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate("/market")} className="pw-btn-ghost h-[38px] px-3 text-sm">← 마켓</button>
        <button onClick={() => navigate("/report")} className="rounded px-3 py-2 text-lg text-[#b4b4b4] transition hover:bg-canvas hover:text-ink2">⋯</button>
      </div>

      <div className="mx-auto px-6 pb-24 pt-7" style={{ maxWidth: 1080 }}>
        <div style={isWide ? { display: "flex", gap: 32, alignItems: "flex-start" } : { display: "block" }}>
          {/* COVER */}
          <div style={isWide ? { width: 240, flexShrink: 0, position: "sticky", top: 80 } : { width: 180, margin: "0 auto 24px" }}>
            <div className="relative">
              <CoverTile title="회귀한 검, 황혼을 베다" author="지훈" variant={0} />
              {gated && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg p-5 text-center" style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", background: "rgba(18,18,18,0.55)" }}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-white/40 bg-white/15 text-lg font-bold text-white">19</div>
                  <div className="text-sm font-bold text-white">성인 인증 후 열람 가능</div>
                </div>
              )}
            </div>
          </div>

          {/* INFO */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-[7px]">
              <span className="rounded-full bg-wash px-2.5 py-1 text-[11px] font-bold text-brand">AI 보조</span>
              <span className={"rounded-full px-2.5 py-1 text-[11px] font-bold " + (gated ? "bg-error-wash text-error" : "bg-[#f2f2f2] text-ink2")}>{gated ? "19세 이용가" : "전체 이용가"}</span>
            </div>

            <h1 className="m-0 text-[28px] font-bold leading-[1.3] tracking-[-0.6px] text-ink">회귀한 검, 황혼을 베다</h1>
            <div className="mt-2 text-[15px] text-ink2">글 · 지훈 &nbsp;·&nbsp; 회귀 · 복수 · 다크판타지</div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-brand">★ 4.8</span>
                <span className="text-[13px] text-muted">(리뷰 312)</span>
              </div>
              <div className="h-3.5 w-px bg-line2" />
              <span className="text-[13px] text-muted">30화 완결 · 조회 12.4만</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-[7px]">
              {["#회귀", "#복수극", "#먼치킨", "#중세"].map((t) => (
                <span key={t} className="rounded-full border border-line2 bg-white px-3 py-1.5 text-xs font-bold text-ink2">{t}</span>
              ))}
            </div>

            <button onClick={() => navigate("/read/1")} className="mt-[22px] h-12 w-full rounded border border-brand bg-white text-[15px] font-bold text-brand transition hover:bg-wash">무료 미리보기 1~2화 ▷</button>

            {/* PRICE BOX */}
            <div className="mt-4 rounded-xl border border-hairline bg-white p-5">
              {gated ? (
                <div className="py-1.5 text-center">
                  <div className="text-[15px] font-bold text-ink">19세 이상 이용가 작품</div>
                  <div className="mt-1.5 text-[13px] leading-[1.5] text-muted">성인 인증을 완료하면 구매하고 열람할 수 있어요.</div>
                  <button onClick={() => { setMode("sale"); showToast("성인 인증 완료 — 이제 구매할 수 있어요"); }} className="mt-4 h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover">성인 인증하기</button>
                </div>
              ) : mode === "purchased" ? (
                <div>
                  <div className="mb-3.5 flex items-center gap-2">
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">✓</span>
                    <span className="text-[15px] font-bold text-ink">구매 완료 · 전체 회차 열람 가능</span>
                  </div>
                  <button onClick={() => navigate("/read/1")} className="mb-2.5 h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover">이어서 읽기 (5화)</button>
                  <button onClick={() => setTipOpen(true)} className="h-12 w-full rounded border border-brand bg-white text-[15px] font-bold text-brand transition hover:bg-wash">♥ 작가 응원하기</button>
                </div>
              ) : mode === "sold" ? (
                <div className="py-1.5 text-center">
                  <div className="text-[15px] font-bold text-muted">현재 판매 중지된 작품이에요</div>
                  <div className="mt-1.5 text-[13px] text-[#b4b4b4]">작가의 사정으로 판매가 일시 중단되었습니다.</div>
                </div>
              ) : (
                <div>
                  <div className="mb-2.5 flex items-center justify-between rounded-lg bg-wash p-3">
                    <div>
                      <div className="text-sm font-bold text-ink">전체 묶음 (30화)</div>
                      <div className="mt-0.5 text-xs font-bold text-brand">회차당 ₩100 · 17% 할인</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] text-[#b4b4b4] line-through">3,600원</span>
                      <div className="text-xl font-bold text-brand">3,000원</div>
                    </div>
                  </div>
                  <div className="mb-4 flex items-center justify-between rounded-lg border border-hairline p-3">
                    <div className="text-sm font-bold text-ink2">회차 단건 구매</div>
                    <div className="text-base font-bold text-ink">회차당 120원</div>
                  </div>
                  <button onClick={() => { setMode("purchased"); showToast("구매 완료! 전체 회차를 읽을 수 있어요"); }} className="mb-2.5 h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 4px 14px rgba(129,107,255,0.32)" }}>전체 구매하기 · 3,000원</button>
                  <button onClick={() => setTipOpen(true)} className="h-12 w-full rounded border border-brand bg-white text-[15px] font-bold text-brand transition hover:bg-wash">♥ 응원하기</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SYNOPSIS */}
        <div className="mt-6 rounded-xl border border-hairline bg-white p-6">
          <div className="mb-3 text-[17px] font-bold text-ink">작품 소개</div>
          <p className="m-0 text-[15px] leading-[1.8] text-[#3a3a3a]">처형대에서 눈을 감았던 카엘은 10년 전으로 돌아왔다. 자신을 배신한 자들, 무너진 가문, 그리고 끝내 지키지 못한 사람. 이번 생에는 다르다. 같은 실수를 반복하지 않기 위해, 그는 가장 차가운 검이 되기로 한다. 회귀자의 정보와 단 한 번의 기회—황혼이 내리기 전에, 모든 것을 되돌릴 수 있을까.</p>
        </div>

        {/* REVIEWS */}
        <div className="mt-4 rounded-xl border border-hairline bg-white p-6">
          <div className="mb-[18px] text-[17px] font-bold text-ink">리뷰 312</div>
          <div style={isWide ? { display: "flex", gap: 32, alignItems: "flex-start" } : { display: "flex", flexDirection: "column", gap: 24 }}>
            {/* distribution */}
            <div className="flex-shrink-0" style={{ width: isWide ? 200 : "100%" }}>
              <div className="mb-3.5 flex items-baseline gap-2">
                <span className="text-[40px] font-bold leading-none text-ink">4.8</span>
                <span className="text-sm font-bold text-brand">★★★★★</span>
              </div>
              {DIST.map((d) => (
                <div key={d.star} className="mb-[7px] flex items-center gap-2">
                  <span className="w-6 text-xs font-bold text-muted">{d.star}★</span>
                  <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-wash">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs text-[#b4b4b4]">{d.pct}%</span>
                </div>
              ))}
            </div>
            {/* list */}
            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              {REVIEWS.map((r) => (
                <div key={r.name} className="border-b border-[#f4f4f4] pb-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-wash text-xs font-bold text-brand">{r.initial}</span>
                      <span className="text-[13px] font-bold text-ink">{r.name}</span>
                      <span className="rounded-full bg-wash px-[7px] py-0.5 text-[11px] font-bold text-brand">구매자</span>
                    </div>
                    <span className="text-xs font-bold text-brand">{r.stars}</span>
                  </div>
                  <p className="m-0 text-sm leading-[1.6] text-[#3a3a3a]">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OTHER WORKS */}
        <div className="mt-6">
          <div className="mb-3.5 text-[17px] font-bold text-ink">작가의 다른 작품</div>
          <div className="pw-scroll flex gap-4 overflow-x-auto pb-2.5">
            {OTHER.map((w, i) => (
              <WorkCard key={i} {...w} onOpen={() => navigate("/market/1")} className="w-40 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* TIP 후원 모달 (공통 컴포넌트 재사용) */}
      <TipModal open={tipOpen} onClose={() => setTipOpen(false)} workTitle="회귀한 검" initialBalance={2000} onToast={showToast} />

      {/* demo switcher */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={mode === "sale"} onClick={() => { setMode("sale"); setTipOpen(false); }}>미구매</DemoSeg>
        <DemoSeg active={mode === "purchased"} onClick={() => { setMode("purchased"); setTipOpen(false); }}>구매완료</DemoSeg>
        <DemoSeg active={gated} onClick={() => { setMode("gate"); setTipOpen(false); }}>19금</DemoSeg>
        <DemoSeg active={mode === "sold"} onClick={() => { setMode("sold"); setTipOpen(false); }}>품절</DemoSeg>
      </div>

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
