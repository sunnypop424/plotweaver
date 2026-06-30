import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { GlobalNav } from "@/components/GlobalNav";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "wallet" | "library" | "purchases" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "wallet", label: "지갑" },
  { key: "library", label: "내 서재" },
  { key: "purchases", label: "구매내역" },
  { key: "settings", label: "설정" },
];

/* ── 더미 데이터 (결제·서재 기능 연동 전 샘플) ──────────────────────────── */
const DUMMY_TX = [
  { title: "잉크 충전 (카카오페이)", date: "2026.06.28", amount: "+5,000", unit: "잉크" },
  { title: "본문 생성 — 회귀한 검 5화", date: "2026.06.27", amount: "-300", unit: "잉크" },
  { title: "표지 생성 — 회귀한 검", date: "2026.06.27", amount: "-800", unit: "잉크" },
  { title: "크레딧 충전 (토스)", date: "2026.06.25", amount: "+10,000", unit: "크레딧" },
  { title: "작품 구매 — 악녀의 일기", date: "2026.06.24", amount: "-3,000", unit: "크레딧" },
];
const DUMMY_PURCHASES = [
  { title: "악녀의 일기 (전체 묶음)", date: "2026.06.24", kind: "작품 구매", amount: "3,000원", refundable: true },
  { title: "황혼의 기사단 12화", date: "2026.06.20", kind: "회차 구매", amount: "500원", refundable: false, statusText: "열람완료" },
  { title: "서리의 군주 (전체 묶음)", date: "2026.06.12", kind: "작품 구매", amount: "4,500원", refundable: false, statusText: "환불불가" },
];

function SampleBadge() {
  return (
    <span className="rounded-full border border-[#ffe4b3] bg-[#fff8ec] px-2.5 py-1 text-[11px] font-bold text-[#b07d2a]">
      샘플 데이터
    </span>
  );
}

function ComingSoonCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-wash text-2xl">🔒</div>
      <div className="text-base font-bold text-ink">{title}</div>
      <div className="mt-1.5 text-sm text-muted">{desc}</div>
    </div>
  );
}

export default function PMyPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("wallet");

  const nickname = (user?.user_metadata?.nickname as string) || user?.email?.split("@")[0] || "사용자";
  const email = user?.email || "";
  const avatarChar = nickname.slice(0, 1).toUpperCase();

  const settingRows = [
    { label: "닉네임", value: nickname },
    { label: "이메일", value: email },
    { label: "성인 인증", value: "미인증" },
    { label: "알림 설정", value: "켜짐" },
    { label: "결제 수단 관리", value: "미등록" },
    { label: "로그아웃", value: "" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <GlobalNav />

      <div className="mx-auto px-6 pb-20 pt-8" style={{ maxWidth: 1080 }}>

        {/* PROFILE */}
        <div className="mb-[26px] flex items-center gap-[18px]">
          <div
            className="flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-full text-[26px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#816bff,#a892ff)", boxShadow: "0 6px 16px rgba(129,107,255,0.3)" }}
          >
            {avatarChar}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[22px] font-bold text-ink">{nickname}</span>
              <span className="rounded-full bg-wash px-2.5 py-[3px] text-xs font-bold text-brand">창작자 등급</span>
            </div>
            <div className="mt-[3px] text-sm text-muted">{email || "이메일 없음"}</div>
          </div>
        </div>

        {/* TABS — 스크롤바 숨김 */}
        <div
          className="mb-6 flex gap-1 border-b border-hairline"
          style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "-mb-px whitespace-nowrap border-b-2 px-5 py-3 text-[15px] font-bold transition " +
                  (on ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink2")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── WALLET ── */}
        {tab === "wallet" && (
          <div style={{ animation: "pw-fade .25s ease" }}>
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">보유 자산</span>
              <SampleBadge />
            </div>
            <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              <div className="rounded-[14px] p-[22px] text-white" style={{ background: "linear-gradient(135deg,#816bff,#6e58ff)", boxShadow: "0 8px 24px rgba(129,107,255,0.3)" }}>
                <div className="text-[13px] font-bold text-white/[0.82]">보유 잉크</div>
                <div className="mt-2 text-[32px] font-bold tracking-[-0.5px]">2,000</div>
                <div className="mt-1 text-xs text-white/70">본문·표지 생성에 사용</div>
                <button onClick={() => navigate("/billing")} className="mt-4 h-10 rounded border-none bg-white px-[18px] text-sm font-bold text-brand">+ 충전하기</button>
              </div>
              <div className="rounded-[14px] border border-hairline bg-white p-[22px]">
                <div className="text-[13px] font-bold text-muted">보유 크레딧</div>
                <div className="mt-2 text-[32px] font-bold tracking-[-0.5px] text-ink">7,000</div>
                <div className="mt-1 text-xs text-muted">작품 구매·후원에 사용</div>
                <button onClick={() => navigate("/billing")} className="pw-btn-slight mt-4 h-10 px-[18px] text-sm">+ 충전하기</button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-[15px] font-bold text-ink">거래 내역</span>
              <SampleBadge />
            </div>
            <div className="overflow-hidden rounded-xl border border-hairline bg-white">
              {DUMMY_TX.map((t, i) => {
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

        {/* ── LIBRARY ── */}
        {tab === "library" && (
          <div style={{ animation: "pw-fade .25s ease" }}>
            <ComingSoonCard title="구매한 작품이 없어요" desc="마켓에서 마음에 드는 작품을 구매하면 여기에 쌓여요." />
          </div>
        )}

        {/* ── PURCHASES ── */}
        {tab === "purchases" && (
          <div style={{ animation: "pw-fade .25s ease" }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">구매내역</span>
              <SampleBadge />
            </div>
            <div className="overflow-hidden rounded-xl border border-hairline bg-white">
              <div className="flex items-center border-b border-hairline bg-[#fafafa] px-[18px] py-3.5 text-xs font-bold text-muted">
                <div className="flex-1">작품 / 내역</div>
                <div className="w-[90px] text-right">결제액</div>
                <div className="w-[110px] text-right">상태</div>
              </div>
              {DUMMY_PURCHASES.map((o, i) => (
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
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="overflow-hidden rounded-xl border border-hairline bg-white" style={{ animation: "pw-fade .25s ease" }}>
            {settingRows.map((r) => (
              <button
                key={r.label}
                onClick={async () => {
                  if (r.label === "로그아웃") {
                    await signOut();
                    navigate("/login");
                  } else {
                    showToast(`${r.label} 설정`);
                  }
                }}
                className={"flex w-full items-center justify-between border-b border-[#f4f4f4] bg-white px-[18px] py-[17px] text-left transition last:border-b-0 hover:bg-[#fafafa]" + (r.label === "로그아웃" ? " text-error" : "")}
              >
                <span className={"text-sm font-bold " + (r.label === "로그아웃" ? "text-error" : "text-ink")}>{r.label}</span>
                {r.value && <span className="text-[13px] text-[#b4b4b4]">{r.value} ›</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
