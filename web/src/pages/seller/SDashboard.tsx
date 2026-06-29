import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";

const CHART = [
  { label: "1월", sale: 42, tip: 12 },
  { label: "2월", sale: 55, tip: 18 },
  { label: "3월", sale: 48, tip: 15 },
  { label: "4월", sale: 70, tip: 22 },
  { label: "5월", sale: 65, tip: 28 },
  { label: "6월", sale: 88, tip: 34 },
];
const WORKS = [
  { title: "회귀한 검, 황혼을 베다", views: "124,000", buys: "1,840", tips: "312", revenue: "1,508,000" },
  { title: "서리의 군주", views: "58,200", buys: "720", tips: "95", revenue: "486,000" },
  { title: "검은 탑의 연인", views: "34,100", buys: "0", tips: "210", revenue: "210,000" },
  { title: "별을 삼킨 아이", views: "21,400", buys: "180", tips: "44", revenue: "142,000" },
];
const MESSAGES = [
  { name: "책벌레김", initial: "책", amount: "3,000원", work: "회귀한 검", text: "완결까지 정주행했어요! 카엘 서사 최고. 다음 작품도 기대할게요." },
  { name: "심야독자", initial: "심", amount: "5,000원", work: "서리의 군주", text: "문장이 정말 좋아요. 작가님 응원합니다 🙏" },
  { name: "복수극매니아", initial: "복", amount: "1,000원", work: "회귀한 검", text: "12화 전개 미쳤습니다... 사이다 그 자체" },
];
const PAYABLE = {
  normal: { val: "1,842,000", note: "최소 출금액 충족 · 즉시 출금 가능", blocked: false },
  low: { val: "4,200", note: "최소 출금액 10,000원 미달", blocked: true },
  zero: { val: "0", note: "정산 가능한 금액이 없어요", blocked: true },
} as const;
type PayMode = keyof typeof PAYABLE;

export default function SDashboard() {
  const { vw } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isWide = vw >= 1024;
  const [period, setPeriod] = useState("month");
  const [payMode, setPayMode] = useState<PayMode>("normal");

  const pm = PAYABLE[payMode];
  const maxVal = Math.max(...CHART.map((c) => c.sale + c.tip));
  const barH = (v: number) => Math.max(4, Math.round((v / maxVal) * 170));

  return (
    <div className="min-h-screen bg-canvas">
      {/* GLOBAL NAV */}
      <div className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex h-16 items-center justify-between px-6" style={{ maxWidth: 1080 }}>
          <div className="flex items-center gap-7">
            <span className="text-xl font-bold tracking-[-0.5px] text-brand">플롯위버</span>
            {isWide && (
              <div className="flex items-center gap-[22px]">
                <button onClick={() => navigate("/library")} className="border-none bg-transparent p-1.5 text-sm font-bold text-muted">작업실</button>
                <button onClick={() => navigate("/seller")} className="border-none bg-transparent p-1.5 text-sm font-bold text-ink">정산</button>
              </div>
            )}
          </div>
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand text-sm font-bold text-white">지</div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-8" style={{ maxWidth: 1080 }}>
        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[28px] font-bold tracking-[-0.5px]">정산 대시보드</div>
            <div className="mt-[5px] text-sm text-muted">수익과 정산 내역을 투명하게 확인해요.</div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="pw-select-wrap">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-11 cursor-pointer rounded border border-hairline bg-white pl-4 pr-[34px] text-sm font-bold text-ink2 outline-none focus:border-brand" style={{ appearance: "none", WebkitAppearance: "none" }}>
                <option value="month">이번 달</option>
                <option value="3month">최근 3개월</option>
                <option value="year">올해</option>
              </select>
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">▼</span>
            </div>
            <button disabled={pm.blocked} onClick={() => showToast("출금 신청이 접수됐어요. 영업일 3일 내 입금돼요")} className={"h-11 rounded border-none px-5 text-sm font-bold transition " + (pm.blocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>출금 신청</button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <SummaryCard label="판매 수익" value="₩2,346,000" delta="▲ 12.4% vs 지난달" />
          <SummaryCard label="후원 수익" value="₩624,000" delta="▲ 8.1% vs 지난달" />
          <div className="rounded-[14px] p-[22px] text-white" style={{ background: "linear-gradient(135deg,#816bff,#6e58ff)", boxShadow: "0 8px 24px rgba(129,107,255,0.3)" }}>
            <div className="text-[13px] font-bold text-white/[0.82]">정산 가능액</div>
            <div className="mt-2 text-[30px] font-bold tracking-[-0.5px]">₩{pm.val}</div>
            <div className="mt-1.5 text-xs text-white/[0.78]">{pm.note}</div>
          </div>
        </div>

        {/* TREND CHART */}
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-[15px] font-bold">수익 추이</div>
            <div className="flex items-center gap-4">
              <Legend color="#816bff" label="판매" />
              <Legend color="#c9bcff" label="후원" />
            </div>
          </div>
          <div className="flex h-[200px] items-end justify-between gap-2.5 pt-2.5">
            {CHART.map((c) => (
              <div key={c.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full items-end justify-center gap-[3px]">
                  <div className="w-3.5 rounded-t-[3px] bg-brand" style={{ height: barH(c.sale), transformOrigin: "bottom", animation: "pw-grow .5s ease" }} title="판매" />
                  <div className="w-3.5 rounded-t-[3px] bg-[#c9bcff]" style={{ height: barH(c.tip), transformOrigin: "bottom", animation: "pw-grow .5s ease" }} title="후원" />
                </div>
                <span className="text-[11px] font-bold text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* FEE BREAKDOWN */}
        <Panel>
          <div className="mb-4 text-[15px] font-bold">수수료 명세</div>
          <div className="flex flex-col gap-[11px]">
            <FeeRow label="총 거래액" value="₩2,970,000" />
            <FeeRow label="플랫폼 수수료 (15%)" value="− ₩445,500" negative />
            <FeeRow label="결제대행 수수료 (3%)" value="− ₩89,100" negative />
            <div className="my-1 h-px bg-hairline" />
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">정산액</span>
              <span className="text-xl font-bold text-brand">₩2,435,400</span>
            </div>
          </div>
        </Panel>

        {/* PER-WORK TABLE */}
        <Panel>
          <div className="mb-4 text-[15px] font-bold">작품별 성과</div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 480 }}>
              <div className="flex items-center border-b border-hairline px-1 pb-3 text-xs font-bold text-muted">
                <div className="min-w-0 flex-[2]">작품</div>
                <div className="flex-1 text-right">조회</div>
                <div className="flex-1 text-right">구매</div>
                <div className="flex-1 text-right">후원</div>
                <div className="flex-1 text-right">수익</div>
              </div>
              {WORKS.map((w, i) => (
                <div key={i} className="flex items-center border-b border-[#f4f4f4] px-1 py-[13px] last:border-b-0">
                  <div className="min-w-0 flex-[2] truncate pr-2 text-sm font-bold text-ink">{w.title}</div>
                  <div className="flex-1 text-right text-[13px] text-ink2">{w.views}</div>
                  <div className="flex-1 text-right text-[13px] text-ink2">{w.buys}</div>
                  <div className="flex-1 text-right text-[13px] text-ink2">{w.tips}</div>
                  <div className="flex-1 text-right text-sm font-bold text-brand">₩{w.revenue}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* SUPPORTER MESSAGES */}
        <Panel last>
          <div className="mb-4 text-[15px] font-bold">후원자 메시지</div>
          <div className="flex flex-col gap-3.5">
            {MESSAGES.map((m) => (
              <div key={m.name} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-wash text-[13px] font-bold text-brand">{m.initial}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold text-ink">{m.name}</span>
                    <span className="rounded-full bg-wash px-2 py-0.5 text-[11px] font-bold text-brand">{m.amount} 후원</span>
                    <span className="text-xs text-[#b4b4b4]">{m.work}</span>
                  </div>
                  <p className="m-0 mt-1.5 text-sm leading-[1.6] text-[#3a3a3a]">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* demo payable state */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={payMode === "normal"} onClick={() => setPayMode("normal")}>정산가능</DemoSeg>
        <DemoSeg active={payMode === "low"} onClick={() => setPayMode("low")}>최소미달</DemoSeg>
        <DemoSeg active={payMode === "zero"} onClick={() => setPayMode("zero")}>0원</DemoSeg>
      </div>

    </div>
  );
}

function SummaryCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-[14px] border border-hairline bg-white p-[22px]">
      <div className="text-[13px] font-bold text-muted">{label}</div>
      <div className="mt-2 text-[30px] font-bold tracking-[-0.5px]">{value}</div>
      <div className="mt-1.5 text-xs font-bold text-[#2f8f5b]">{delta}</div>
    </div>
  );
}
function Panel({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <div className={"rounded-[14px] border border-hairline bg-white p-[22px] " + (last ? "" : "mb-4")}>{children}</div>;
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink2">
      <span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}
function FeeRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink2">{label}</span>
      <span className={"font-bold " + (negative ? "text-error" : "text-ink")}>{value}</span>
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
