import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useViewport } from "@/lib/useViewport";
import { useAuth } from "@/providers/AuthProvider";
import { listNovels } from "@/lib/api";

function SampleBadge() {
  return (
    <span className="rounded-full border border-[#ffe4b3] bg-[#fff8ec] px-2.5 py-1 text-[11px] font-bold text-[#b07d2a]">
      샘플 데이터
    </span>
  );
}

const CHART = [
  { label: "1월", sale: 42, tip: 12 },
  { label: "2월", sale: 55, tip: 18 },
  { label: "3월", sale: 48, tip: 15 },
  { label: "4월", sale: 70, tip: 22 },
  { label: "5월", sale: 65, tip: 28 },
  { label: "6월", sale: 88, tip: 34 },
];
const MESSAGES = [
  { name: "책벌레김", initial: "책", amount: "3,000원", work: "회귀한 검", text: "완결까지 정주행했어요! 카엘 서사 최고. 다음 작품도 기대할게요." },
  { name: "심야독자", initial: "심", amount: "5,000원", work: "서리의 군주", text: "문장이 정말 좋아요. 작가님 응원합니다 🙏" },
  { name: "복수극매니아", initial: "복", amount: "1,000원", work: "회귀한 검", text: "12화 전개 미쳤습니다... 사이다 그 자체" },
];

export default function SDashboard() {
  const { vw } = useViewport();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWide = vw >= 1024;
  const [period, setPeriod] = useState("month");
  const [sellingWorks, setSellingWorks] = useState<{ id: string; title: string }[]>([]);

  const nickname = (user?.user_metadata?.nickname as string) || user?.email?.split("@")[0] || "사용자";
  const avatarChar = nickname.slice(0, 1).toUpperCase();

  useEffect(() => {
    listNovels()
      .then((ns) => setSellingWorks(ns.filter((n) => n.status === "selling" || n.status === "public")))
      .catch(() => {});
  }, []);

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
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{avatarChar}</div>
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
            <button disabled className="h-11 cursor-default rounded border-none bg-hairline px-5 text-sm font-bold text-[#b4b4b4]">출금 신청</button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div className="rounded-[14px] border border-hairline bg-white p-[22px]">
            <div className="text-[13px] font-bold text-muted">판매 수익</div>
            <div className="mt-2 text-[30px] font-bold tracking-[-0.5px]">₩0</div>
            <div className="mt-1.5 text-xs font-bold text-muted">수익 분석 준비 중</div>
          </div>
          <div className="rounded-[14px] border border-hairline bg-white p-[22px]">
            <div className="text-[13px] font-bold text-muted">후원 수익</div>
            <div className="mt-2 text-[30px] font-bold tracking-[-0.5px]">₩0</div>
            <div className="mt-1.5 text-xs font-bold text-muted">수익 분석 준비 중</div>
          </div>
          <div className="rounded-[14px] p-[22px] text-white" style={{ background: "linear-gradient(135deg,#816bff,#6e58ff)", boxShadow: "0 8px 24px rgba(129,107,255,0.3)" }}>
            <div className="text-[13px] font-bold text-white/[0.82]">정산 가능액</div>
            <div className="mt-2 text-[30px] font-bold tracking-[-0.5px]">₩0</div>
            <div className="mt-1.5 text-xs text-white/[0.78]">정산 데이터 준비 중이에요</div>
          </div>
        </div>

        {/* TREND CHART (sample) */}
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold">수익 추이</span>
              <SampleBadge />
            </div>
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
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[15px] font-bold">수수료 명세</span>
            <SampleBadge />
          </div>
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

        {/* SELLING WORKS */}
        {sellingWorks.length > 0 && (
          <Panel>
            <div className="mb-4 text-[15px] font-bold">판매 중인 작품</div>
            <div className="flex flex-col gap-2">
              {sellingWorks.map((w) => (
                <button key={w.id} onClick={() => navigate(`/works/${w.id}`)} className="flex w-full items-center justify-between rounded-lg border border-hairline bg-[#fafafa] px-4 py-3 text-left transition hover:bg-wash">
                  <span className="text-sm font-bold text-ink">{w.title}</span>
                  <span className="text-[13px] text-brand">보기 →</span>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {/* SUPPORTER MESSAGES (sample) */}
        <Panel last>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[15px] font-bold">후원자 메시지</span>
            <SampleBadge />
          </div>
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
