import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";

const fmt = (n: number) => n.toLocaleString("ko-KR");

type Pkg = { ink: string; price: string; amount: number; inkN: number; bonus?: string };
const PACKAGES: Pkg[] = [
  { ink: "3,000 잉크", price: "3,000원", amount: 3000, inkN: 3000 },
  { ink: "5,000 잉크", price: "5,000원", amount: 5000, inkN: 5000 },
  { ink: "10,000 잉크", price: "10,000원", amount: 10000, inkN: 10000, bonus: "+500 보너스" },
  { ink: "30,000 잉크", price: "30,000원", amount: 30000, inkN: 30000, bonus: "+3,000 보너스" },
];
type Method = { key: string; name: string; icon: string; bg: string; fg: string };
const METHODS: Method[] = [
  { key: "kakao", name: "카카오페이", icon: "💬", bg: "#FEE500", fg: "#191600" },
  { key: "naver", name: "네이버페이", icon: "N", bg: "#03C75A", fg: "#fff" },
  { key: "toss", name: "토스페이", icon: "T", bg: "#3182F6", fg: "#fff" },
  { key: "applepay", name: "Apple / Google Pay", icon: "", bg: "#121212", fg: "#fff" },
];
const MORE_METHODS: Method[] = [
  { key: "card", name: "신용·체크카드", icon: "카", bg: "#f0edff", fg: "#816bff" },
  { key: "bank", name: "계좌이체", icon: "계", bg: "#f0edff", fg: "#816bff" },
];
const OWNED = 2000;
const MONTH_USED = 178000;
const MONTH_LIMIT = 200000;

const PLAN_DEFS = [
  { name: "Free", desc: "맛보기로 시작하기. 월 3회 생성.", m: 0, y: 0, rec: false, btn: "현재 이용 중", owned: true },
  { name: "Basic", desc: "취미 창작자용. 월 30회 생성 + 표지 10장.", m: 9900, y: 99000, rec: true, btn: "시작하기", owned: false },
  { name: "Pro", desc: "전업 창작자용. 무제한 생성 + 우선 처리.", m: 19900, y: 199000, rec: false, btn: "시작하기", owned: false },
];

export default function PPayment() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const payT = useRef<number | undefined>(undefined);

  const [tab, setTab] = useState<"charge" | "plan">("charge");
  const [pkgIdx, setPkgIdx] = useState(1);
  const [method, setMethod] = useState("kakao");
  const [showMore, setShowMore] = useState(false);
  const [agree, setAgree] = useState(true);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<null | "success" | "fail">(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [minorMode, setMinorMode] = useState(false);

  const pkg = PACKAGES[pkgIdx];
  const overLimit = minorMode && MONTH_USED + pkg.amount > MONTH_LIMIT;
  const limitPct = Math.min(100, Math.round((MONTH_USED / MONTH_LIMIT) * 100));
  const payBlocked = paying || !agree || overLimit;
  const yearly = cycle === "yearly";

  const pay = () => {
    if (overLimit) return setResult("fail");
    if (!agree) return;
    setPaying(true);
    payT.current = window.setTimeout(() => { setPaying(false); setResult("success"); }, 1500);
  };

  const methods = showMore ? [...METHODS, ...MORE_METHODS] : METHODS;

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <div className="flex h-[60px] items-center border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="mr-20 flex-1 text-center text-base font-bold">충전 · 요금제</div>
      </div>

      <div className="mx-auto px-5 pb-16 pt-7" style={{ maxWidth: 520 }}>
        {/* tab toggle */}
        <div className="mb-6 flex gap-1 rounded-full bg-[#ededf2] p-1">
          <TabBtn active={tab === "charge"} onClick={() => setTab("charge")}>잉크 충전</TabBtn>
          <TabBtn active={tab === "plan"} onClick={() => setTab("plan")}>구독 플랜</TabBtn>
        </div>

        {tab === "charge" ? (
          <div style={{ animation: "pw-fade .25s ease" }}>
            {/* packages */}
            <div className="mb-2.5 text-sm font-bold text-ink">충전 잉크 선택</div>
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {PACKAGES.map((p, i) => {
                const on = pkgIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => setPkgIdx(i)}
                    className={"relative flex flex-col items-start rounded-[10px] border-[1.5px] bg-white p-4 text-left transition " + (on ? "border-brand shadow-[0_0_0_3px_rgba(129,107,255,0.12)]" : "border-hairline")}
                  >
                    <div className={"text-lg font-bold " + (on ? "text-brand" : "text-ink")}>{p.ink}</div>
                    <div className="mt-[3px] text-[13px] text-muted">{p.price}</div>
                    {p.bonus && <div className="mt-[7px] inline-block rounded-full bg-wash px-2 py-0.5 text-[11px] font-bold text-brand">{p.bonus}</div>}
                  </button>
                );
              })}
            </div>

            {/* summary */}
            <div className="mb-[18px] rounded-xl border border-hairline bg-white p-[18px]">
              <Row label="충전 잉크" value={`+ ${fmt(pkg.inkN)} 잉크`} valueClass="font-bold text-ink" />
              <Row label="보유 잉크" value={`${fmt(OWNED)} 잉크`} valueClass="font-bold text-ink2" />
              <div className="my-2.5 h-px bg-hairline" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">충전 후 잉크</span>
                <span className="text-xl font-bold text-brand">{fmt(OWNED + pkg.inkN)} 잉크</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted">결제 금액</span>
                <span className="text-lg font-bold text-ink">₩{fmt(pkg.amount)}</span>
              </div>
            </div>

            {/* minor limit gauge */}
            <div className={"rounded-xl border p-4 transition " + (overLimit ? "border-[#fcdada] bg-error-wash" : "border-wash-border bg-wash")}>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={"text-[13px] font-bold " + (overLimit ? "text-error" : "text-brand")}>미성년 결제 한도</span>
                  <span className="rounded-full bg-[#a892ff] px-[7px] py-0.5 text-[11px] font-bold text-white">만 19세 미만</span>
                </div>
                <span className={"text-xs font-bold " + (overLimit ? "text-error" : "text-brand")}>월 {fmt(MONTH_USED)} / 200,000원</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-hairline bg-white">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${limitPct}%`, background: overLimit ? "#f16361" : "#816bff" }} />
              </div>
              <div className={"mt-2 text-xs leading-[1.5] " + (overLimit ? "text-[#c0504e]" : "text-[#7a6ab0]")}>
                {!minorMode
                  ? "미성년 회원은 1회 50,000원 · 월 200,000원 한도가 적용돼요."
                  : overLimit
                  ? "이번 결제로 월 한도(200,000원)를 초과해요. 충전 금액을 줄이거나 다음 달에 다시 시도해 주세요."
                  : `이번 달 ${fmt(MONTH_LIMIT - MONTH_USED)}원 더 결제할 수 있어요.`}
              </div>
            </div>

            {/* pay methods */}
            <div className="my-[22px] mb-2.5 text-sm font-bold text-ink">결제 수단</div>
            <div className="flex flex-col gap-2">
              {methods.map((m) => {
                const on = method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={"flex w-full items-center justify-between rounded-[10px] border-[1.5px] bg-white px-4 py-[13px] transition " + (on ? "border-brand shadow-[0_0_0_3px_rgba(129,107,255,0.12)]" : "border-hairline")}
                  >
                    <span className="flex items-center gap-[11px]">
                      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-sm font-bold" style={{ background: m.bg, color: m.fg }}>{m.icon}</span>
                      <span className="text-[15px] font-bold text-ink">{m.name}</span>
                    </span>
                    <span className="box-border h-5 w-5 rounded-full transition-all" style={{ border: on ? "6px solid #816bff" : "2px solid #d4d4d4" }} />
                  </button>
                );
              })}
              <button onClick={() => setShowMore((v) => !v)} className="self-center p-2 text-[13px] font-bold text-brand">{showMore ? "간편결제만 보기" : "카드·계좌이체 더보기"}</button>
            </div>

            {/* agree */}
            <button onClick={() => setAgree((v) => !v)} className="mt-2 flex items-center gap-[11px] py-2 text-left">
              <span className={"flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-[13px] font-bold text-white transition " + (agree ? "border-[1.5px] border-brand bg-brand" : "border-[1.5px] border-[#d4d4d4] bg-white")}>{agree ? "✓" : ""}</span>
              <span className="text-[13px] font-bold text-ink2">결제 진행 및 전자금융거래 약관에 동의합니다. (필수)</span>
            </button>

            {/* pay button */}
            <button disabled={payBlocked} onClick={pay} className={"mt-[18px] h-14 w-full rounded border-none text-[17px] font-bold transition " + (payBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>
              {paying ? (
                <><span className="mr-2.5 inline-block h-[17px] w-[17px] animate-spin rounded-full border-2 border-white/40 border-t-white align-[-3px]" />결제 중...</>
              ) : overLimit ? "월 한도 초과 — 결제 불가" : `₩${fmt(pkg.amount)} 결제하기`}
            </button>
          </div>
        ) : (
          <div style={{ animation: "pw-fade .25s ease" }}>
            <div className="mb-[22px] flex justify-center">
              <div className="flex gap-1 rounded-full bg-[#ededf2] p-1">
                <CycleBtn active={!yearly} onClick={() => setCycle("monthly")}>월간</CycleBtn>
                <button onClick={() => setCycle("yearly")} className={"inline-flex h-[38px] items-center rounded-full px-4 text-[13px] font-bold transition " + (yearly ? "bg-white text-brand shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "bg-transparent text-muted")}>
                  연간 <span className="ml-[3px] rounded-full bg-wash px-1.5 py-px text-[11px] text-brand">2개월 무료</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {PLAN_DEFS.map((p) => {
                const price = p.m === 0 ? "무료" : `₩${fmt(yearly ? Math.round(p.y / 12) : p.m)}`;
                const unit = p.m === 0 ? "" : yearly ? "/월 (연 결제)" : "/월";
                return (
                  <div key={p.name} className={"relative rounded-xl border-[1.5px] bg-white px-5 py-[22px] " + (p.rec ? "border-brand shadow-[0_6px_20px_rgba(129,107,255,0.16)]" : "border-hairline")}>
                    {p.rec && <div className="absolute -top-2.5 left-5 rounded-full bg-brand px-[11px] py-[3px] text-[11px] font-bold text-white">추천</div>}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[17px] font-bold text-ink">{p.name}</div>
                        <div className="mt-1 text-[13px] leading-[1.5] text-muted">{p.desc}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xl font-bold text-ink">{price}</div>
                        <div className="text-xs text-muted">{unit}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast(`${p.name} 플랜을 선택했어요`)}
                      disabled={p.owned}
                      className={"mt-4 h-[46px] w-full rounded text-sm font-bold transition " + (p.owned ? "cursor-default border-none bg-[#f0f0f2] text-muted" : p.rec ? "border-none bg-brand text-white hover:bg-brand-hover" : "border border-brand bg-white text-brand hover:bg-wash")}
                    >
                      {p.btn}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* result overlay */}
      {result && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div className="w-full max-w-[360px] rounded-2xl bg-white px-7 py-[34px] text-center" style={{ animation: "pw-pop .25s ease" }}>
            <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-full text-3xl font-bold text-white" style={{ background: result === "success" ? "#816bff" : "#f16361" }}>{result === "success" ? "✓" : "!"}</div>
            <div className="mt-[18px] text-[19px] font-bold text-ink">{result === "success" ? "충전 완료!" : "결제하지 못했어요"}</div>
            <div className="mt-2 text-sm leading-[1.6] text-muted">
              {result === "success"
                ? `${fmt(pkg.inkN)} 잉크가 충전됐어요. 이제 ${fmt(OWNED + pkg.inkN)} 잉크를 사용할 수 있어요.`
                : "미성년 회원 월 결제 한도(200,000원)를 초과했어요. 크레딧은 차감되지 않았어요."}
            </div>
            <button onClick={() => setResult(null)} className={"mt-[22px] h-[50px] w-full rounded border-none text-[15px] font-bold " + (result === "success" ? "bg-brand text-white" : "bg-[#f0f0f2] text-ink2")}>{result === "success" ? "확인" : "닫기"}</button>
          </div>
        </div>
      )}

      {/* demo state switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
        <DemoSeg active={!minorMode} onClick={() => setMinorMode(false)}>기본</DemoSeg>
        <DemoSeg active={minorMode} onClick={() => { setMinorMode(true); setTab("charge"); }}>한도초과</DemoSeg>
      </div>

    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"h-[42px] flex-1 rounded-full text-sm font-bold transition " + (active ? "bg-white text-brand shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
function CycleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"h-[38px] rounded-full px-[18px] text-[13px] font-bold transition " + (active ? "bg-white text-brand shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
function DemoSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-full px-3 py-[7px] text-[13px] font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-muted")}>
      {children}
    </button>
  );
}
function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
