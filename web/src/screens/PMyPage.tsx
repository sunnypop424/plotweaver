import { useState } from "react";
import { WorkCard, type Badge } from "../components/WorkCard";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

type Tab = "wallet" | "library" | "purchases" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "wallet", label: "지갑" },
  { key: "library", label: "내 서재" },
  { key: "purchases", label: "구매내역" },
  { key: "settings", label: "설정" },
];

const TX = [
  { title: "잉크 충전 (카카오페이)", date: "2026.06.28", amount: "+5,000", unit: "잉크" },
  { title: "본문 생성 — 회귀한 검 5화", date: "2026.06.27", amount: "-300", unit: "잉크" },
  { title: "표지 생성 — 회귀한 검", date: "2026.06.27", amount: "-800", unit: "잉크" },
  { title: "크레딧 충전 (토스)", date: "2026.06.25", amount: "+10,000", unit: "크레딧" },
  { title: "작품 구매 — 악녀의 일기", date: "2026.06.24", amount: "-3,000", unit: "크레딧" },
];
const LIBRARY: { title: string; author: string; rating: string; price: string; badge: Badge; variant: number }[] = [
  { title: "악녀의 일기", author: "세라", rating: "4.6", price: "구매함", badge: "paid", variant: 2 },
  { title: "현대 마법사", author: "도윤", rating: "4.7", price: "무료", badge: "free", variant: 3 },
  { title: "황혼의 기사단", author: "린", rating: "4.9", price: "구매함", badge: "paid", variant: 1 },
  { title: "별을 삼킨 아이", author: "소리", rating: "4.5", price: "무료", badge: "free", variant: 0 },
  { title: "서리의 군주", author: "강", rating: "4.8", price: "구매함", badge: "paid", variant: 4 },
];
const PURCHASES = [
  { title: "악녀의 일기 (전체 묶음)", date: "2026.06.24", kind: "작품 구매", amount: "3,000원", refundable: true, statusText: "" },
  { title: "황혼의 기사단 12화", date: "2026.06.20", kind: "회차 구매", amount: "500원", refundable: false, statusText: "열람완료" },
  { title: "서리의 군주 (전체 묶음)", date: "2026.06.12", kind: "작품 구매", amount: "4,500원", refundable: false, statusText: "환불불가" },
  { title: "현대 마법사 후원", date: "2026.06.05", kind: "후원", amount: "3,000원", refundable: false, statusText: "완료" },
];

export default function PMyPage() {
  const { vw } = useViewport();
  const { toast, showToast } = useToast();
  const isWide = vw >= 1024;
  const [tab, setTab] = useState<Tab>("wallet");
  const [emptyLib, setEmptyLib] = useState(false);

  const settingRows = [
    { label: "닉네임", value: "지훈" },
    { label: "성인 인증", value: "미인증" },
    { label: "알림 설정", value: "켜짐" },
    { label: "결제 수단 관리", value: "카카오페이" },
    { label: "로그아웃", value: "" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* GLOBAL NAV */}
      <div className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex h-16 items-center justify-between px-6" style={{ maxWidth: 1080 }}>
          <div className="flex items-center gap-7">
            <span className="text-xl font-bold tracking-[-0.5px] text-brand">플롯위버</span>
            {isWide && (
              <div className="flex items-center gap-[22px]">
                <button onClick={() => showToast("작업실로 이동")} className="border-none bg-transparent p-1.5 text-sm font-bold text-muted transition-colors hover:text-brand">작업실</button>
                <button onClick={() => showToast("마켓으로 이동")} className="border-none bg-transparent p-1.5 text-sm font-bold text-muted transition-colors hover:text-brand">마켓</button>
              </div>
            )}
          </div>
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand text-sm font-bold text-white">지</div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-8" style={{ maxWidth: 1080 }}>
        {/* PROFILE */}
        <div className="mb-[26px] flex items-center gap-[18px]">
          <div className="flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-full text-[26px] font-bold text-white" style={{ background: "linear-gradient(135deg,#816bff,#a892ff)", boxShadow: "0 6px 16px rgba(129,107,255,0.3)" }}>지</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[22px] font-bold text-ink">지훈</span>
              <span className="rounded-full bg-wash px-2.5 py-[3px] text-xs font-bold text-brand">창작자 등급</span>
            </div>
            <div className="mt-[3px] text-sm text-muted">jihoon@plotweaver.app</div>
          </div>
        </div>

        {/* TABS */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-hairline">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={"-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-[15px] font-bold transition " + (on ? "border-brand text-brand" : "border-transparent text-muted")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* WALLET */}
        {tab === "wallet" && (
          <div style={{ animation: "pw-fade .25s ease" }}>
            <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              <div className="rounded-[14px] p-[22px] text-white" style={{ background: "linear-gradient(135deg,#816bff,#6e58ff)", boxShadow: "0 8px 24px rgba(129,107,255,0.3)" }}>
                <div className="text-[13px] font-bold text-white/[0.82]">보유 잉크</div>
                <div className="mt-2 text-[32px] font-bold tracking-[-0.5px]">2,000</div>
                <div className="mt-1 text-xs text-white/70">본문·표지 생성에 사용</div>
                <button onClick={() => showToast("충전 화면으로 이동합니다")} className="mt-4 h-10 rounded border-none bg-white px-[18px] text-sm font-bold text-brand">+ 충전하기</button>
              </div>
              <div className="rounded-[14px] border border-hairline bg-white p-[22px]">
                <div className="text-[13px] font-bold text-muted">보유 크레딧</div>
                <div className="mt-2 text-[32px] font-bold tracking-[-0.5px] text-ink">7,000</div>
                <div className="mt-1 text-xs text-muted">작품 구매·후원에 사용</div>
                <button onClick={() => showToast("충전 화면으로 이동합니다")} className="pw-btn-slight mt-4 h-10 px-[18px] text-sm">+ 충전하기</button>
              </div>
            </div>

            <div className="mb-3 text-[15px] font-bold text-ink">거래 내역</div>
            <div className="overflow-hidden rounded-xl border border-hairline bg-white">
              {TX.map((t, i) => {
                const plus = t.amount.startsWith("+");
                return (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[#f4f4f4] px-[18px] py-4 last:border-b-0">
                    <div className="flex min-w-0 items-center gap-[13px]">
                      <span className={"flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold " + (plus ? "bg-wash text-brand" : "bg-[#f4f4f4] text-muted")}>{plus ? "↑" : "↓"}</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink">{t.title}</div>
                        <div className="mt-0.5 text-xs text-muted">{t.date}</div>
                      </div>
                    </div>
                    <span className={"flex-shrink-0 whitespace-nowrap text-sm font-bold " + (plus ? "text-brand" : "text-ink2")}>{t.amount} {t.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIBRARY (B1) */}
        {tab === "library" && (
          <div style={{ animation: "pw-fade .25s ease" }}>
            {emptyLib ? (
              <div className="rounded-2xl border border-dashed border-wash-2 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px] bg-wash text-[32px]">📚</div>
                <div className="text-[19px] font-bold text-ink">서재가 비어 있어요</div>
                <div className="mt-2 text-sm leading-[1.6] text-muted">마켓에서 마음에 드는 작품을 구매하면<br />여기 내 서재에 담겨요.</div>
                <button onClick={() => showToast("마켓으로 이동")} className="mt-[22px] h-12 rounded border-none bg-brand px-[22px] text-[15px] font-bold text-white transition hover:bg-brand-hover">마켓 둘러보기</button>
              </div>
            ) : (
              <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
                {LIBRARY.map((w, i) => (
                  <WorkCard key={i} {...w} onOpen={() => showToast(`「${w.title}」 읽기 뷰어로 이동합니다`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PURCHASES */}
        {tab === "purchases" && (
          <div className="overflow-hidden rounded-xl border border-hairline bg-white" style={{ animation: "pw-fade .25s ease" }}>
            <div className="flex items-center border-b border-hairline bg-[#fafafa] px-[18px] py-3.5 text-xs font-bold text-muted">
              <div className="flex-1">작품 / 내역</div>
              <div className="w-[90px] text-right">결제액</div>
              <div className="w-[110px] text-right">상태</div>
            </div>
            {PURCHASES.map((o, i) => (
              <div key={i} className="flex items-center border-b border-[#f4f4f4] px-[18px] py-4 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{o.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{o.date} · {o.kind}</div>
                </div>
                <div className="w-[90px] text-right text-sm font-bold text-ink">{o.amount}</div>
                <div className="w-[110px] text-right">
                  {o.refundable ? (
                    <button onClick={() => showToast(`「${o.title}」 환불 요청`)} className="rounded-full border-none bg-wash px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-wash-2">환불 가능</button>
                  ) : (
                    <span className="text-xs font-bold text-[#b4b4b4]">{o.statusText}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="overflow-hidden rounded-xl border border-hairline bg-white" style={{ animation: "pw-fade .25s ease" }}>
            {settingRows.map((r) => (
              <button key={r.label} onClick={() => showToast(`${r.label}`)} className="flex w-full items-center justify-between border-b border-[#f4f4f4] bg-white px-[18px] py-[17px] text-left transition last:border-b-0 hover:bg-[#fafafa]">
                <span className="text-sm font-bold text-ink">{r.label}</span>
                <span className="text-[13px] text-[#b4b4b4]">{r.value} ›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* demo switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={!emptyLib} onClick={() => { setEmptyLib(false); setTab("library"); }}>보유</DemoSeg>
        <DemoSeg active={emptyLib} onClick={() => { setEmptyLib(true); setTab("library"); }}>빈 서재</DemoSeg>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-3 py-[7px] text-[13px] font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
