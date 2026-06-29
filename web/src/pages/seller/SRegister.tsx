import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";

type Visibility = "private" | "free" | "paid";
type Rating = "all" | "15" | "19";
type GateMode = "blocked" | "pass" | "review";
type Grade = "user" | "assist" | "ai";

const VIS_DEFS: { key: Visibility; label: string; desc: string }[] = [
  { key: "private", label: "비공개", desc: "나만 볼 수 있어요. 언제든 변경 가능." },
  { key: "free", label: "무료 공개", desc: "마켓에 무료로 공개돼요. 후원은 받을 수 있어요." },
  { key: "paid", label: "유료 판매", desc: "가격을 정해 판매해요. 창작 기여 점검이 필요해요." },
];
const RATING_DEFS: { key: Rating; label: string }[] = [
  { key: "all", label: "전체 이용가" },
  { key: "15", label: "15세" },
  { key: "19", label: "19세" },
];
const PREVIEW_OPTS = [1, 2, 3, 5];

const CHAPTERS_BLOCKED: { title: string; editPct: number; grade: Grade }[] = [
  { title: "1화. 회귀", editPct: 62, grade: "user" },
  { title: "2화. 첫 번째 칼날", editPct: 48, grade: "assist" },
  { title: "3화. 배신의 밤", editPct: 8, grade: "ai" },
  { title: "4화. 옛 동료", editPct: 35, grade: "assist" },
  { title: "5화. 되돌아온 새벽", editPct: 3, grade: "ai" },
];
const CHAPTERS_PASS: { title: string; editPct: number; grade: Grade }[] = [
  { title: "1화. 회귀", editPct: 62, grade: "user" },
  { title: "2화. 첫 번째 칼날", editPct: 48, grade: "assist" },
  { title: "3화. 배신의 밤", editPct: 41, grade: "assist" },
  { title: "4화. 옛 동료", editPct: 55, grade: "user" },
  { title: "5화. 되돌아온 새벽", editPct: 38, grade: "assist" },
];

export default function SRegister() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [visibility, setVisibility] = useState<Visibility>("paid");
  const [bundlePrice, setBundlePrice] = useState("3,000");
  const [unitPrice, setUnitPrice] = useState("120");
  const [previewCount, setPreviewCount] = useState(2);
  const [rating, setRating] = useState<Rating>("all");
  const [warrant, setWarrant] = useState(true);
  const [gateMode, setGateMode] = useState<GateMode>("blocked");

  const isPaid = visibility === "paid";
  const chaptersRaw = gateMode === "blocked" ? CHAPTERS_BLOCKED : CHAPTERS_PASS;
  const blockedCount = chaptersRaw.filter((c) => c.grade === "ai").length;
  const gateBlocked = isPaid && gateMode === "blocked" && blockedCount > 0;
  const isReview = gateMode === "review";

  const submitBlocked = (isPaid && gateBlocked) || !warrant || isReview;
  const blockReason = isReview
    ? "검수 대기 중이에요. 결과를 기다려 주세요."
    : isPaid && gateBlocked
    ? "AI 생성 회차를 편집해야 판매 등록할 수 있어요."
    : !warrant
    ? "비침해 보증에 동의해 주세요."
    : "";
  const submitLabel = isReview ? "검수 대기 중" : !isPaid ? (visibility === "free" ? "무료로 공개하기" : "비공개로 저장하기") : "판매 등록하기";

  const submit = () => {
    if (isReview) return;
    showToast("검수 큐에 등록했어요. 결과는 알림으로 알려드려요");
    setGateMode("review");
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="text-base font-bold">작품 판매 등록</div>
        <button onClick={() => showToast("임시저장됨")} className="pw-btn-slight h-10 px-4 text-sm">임시저장</button>
      </div>

      <div className="mx-auto px-5 pb-[120px] pt-7" style={{ maxWidth: 680 }}>
        <div className="mb-[22px]">
          <div className="text-2xl font-bold tracking-[-0.5px]">「회귀한 검, 황혼을 베다」</div>
          <div className="mt-[5px] text-sm text-muted">판매 등록 전, 공개 설정과 창작 기여를 확인해요.</div>
        </div>

        {/* VISIBILITY */}
        <Card title="공개 범위">
          <div className="flex flex-col gap-2.5">
            {VIS_DEFS.map((v) => {
              const on = visibility === v.key;
              return (
                <button key={v.key} onClick={() => setVisibility(v.key)} className={"flex w-full items-center gap-[13px] rounded-[10px] border-[1.5px] p-[15px] text-left transition " + (on ? "border-brand bg-wash" : "border-hairline bg-white")}>
                  <span className="box-border h-5 w-5 flex-shrink-0 rounded-full transition-all" style={{ border: on ? "6px solid #816bff" : "2px solid #d4d4d4" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-ink">{v.label}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{v.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* PRICE (paid only) */}
        {isPaid && (
          <Card title="가격 설정" anim>
            <div className="grid grid-cols-2 gap-3">
              <PriceInput label="전체 묶음가" value={bundlePrice} onChange={(v) => setBundlePrice(v.replace(/[^0-9,]/g, ""))} />
              <PriceInput label="회차 단건가" value={unitPrice} onChange={(v) => setUnitPrice(v.replace(/[^0-9,]/g, ""))} />
            </div>
            <div className="mt-3.5">
              <div className="mb-[7px] pw-field-label">무료 미리보기</div>
              <div className="flex gap-2">
                {PREVIEW_OPTS.map((n) => {
                  const on = previewCount === n;
                  return (
                    <button key={n} onClick={() => setPreviewCount(n)} className={"h-[42px] flex-1 rounded border text-sm font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}>{n}화</button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* AGE RATING */}
        <Card title="연령 등급">
          <div className="flex gap-2">
            {RATING_DEFS.map((r) => {
              const on = rating === r.key;
              return (
                <button key={r.key} onClick={() => setRating(r.key)} className={"h-[46px] flex-1 rounded border text-sm font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}>{r.label}</button>
              );
            })}
          </div>
          {rating === "19" && (
            <div className="mt-3.5 flex items-start gap-[9px] rounded-lg bg-error-wash px-3.5 py-3">
              <span className="text-[15px] font-bold leading-tight text-error">!</span>
              <span className="text-[13px] font-bold leading-[1.5] text-[#c0504e]">19세 등급은 성인 인증된 독자에게만 노출되며, 본인 성인 인증이 연계됩니다.</span>
            </div>
          )}
        </Card>

        {/* AI LABEL */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-bold">AI 기여 라벨</div>
              <div className="mt-1 text-[13px] leading-[1.5] text-muted">편집 비중에 따라 자동 산정돼요. 마켓에 정직하게 표기됩니다.</div>
            </div>
            <span className={"flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold " + (gateBlocked ? "bg-error-wash text-error" : "bg-wash text-brand")}>{gateBlocked ? "AI 생성" : "AI 보조"}</span>
          </div>
        </Card>

        {/* CONTRIBUTION GATE */}
        {isPaid && (
          <div className={"mb-4 rounded-xl border p-[22px] transition " + (gateBlocked ? "border-[#fcdada] bg-[#fff7f7]" : "border-[#d4ecd9] bg-[#f3faf5]")}>
            <div className="mb-1.5 flex items-center gap-[9px]">
              <span className={"text-[15px] font-bold " + (gateBlocked ? "text-[#c0504e]" : "text-[#2f8f5b]")}>창작 기여 점검</span>
              <span className="rounded-full px-2.5 py-[3px] text-[11px] font-bold text-white" style={{ background: gateBlocked ? "#f16361" : "#2f8f5b" }}>{gateBlocked ? "판매 차단" : "통과"}</span>
            </div>
            <div className={"mb-4 text-[13px] leading-[1.6] " + (gateBlocked ? "text-[#a86462]" : "text-[#5a7d68]")}>
              {gateBlocked
                ? '판매하려면 모든 회차가 "AI 보조" 이상이어야 해요. 직접 편집 비중을 높이면 등급이 올라가요.'
                : '모든 회차가 "AI 보조" 등급 이상이에요. 판매 등록할 수 있어요.'}
            </div>

            <div className="overflow-hidden rounded-[10px] border border-hairline bg-white">
              {chaptersRaw.map((c, i) => {
                const isAi = c.grade === "ai";
                return (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[#f4f4f4] px-4 py-[13px] last:border-b-0">
                    <div className="flex min-w-0 items-center gap-[11px]">
                      <span className={"flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-sm font-bold " + (isAi ? "bg-error text-white" : "bg-wash text-brand")}>{isAi ? "!" : "✓"}</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink">{c.title}</div>
                        <div className="mt-px text-xs text-muted">직접 편집 {c.editPct}%</div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5">
                      <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (isAi ? "bg-error-wash text-error" : "bg-wash text-brand")}>{isAi ? "AI 생성" : "AI 보조"}</span>
                      {isAi && (
                        <button onClick={() => navigate("/works/1/edit")} className="whitespace-nowrap rounded bg-wash px-2.5 py-[7px] text-xs font-bold text-brand transition hover:bg-wash-2">편집 →</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {gateBlocked && (
              <div className="mt-3.5 flex items-start gap-[9px]">
                <span className="text-[15px] font-bold leading-tight text-error">!</span>
                <span className="text-[13px] font-bold leading-[1.5] text-[#c0504e]">"AI 생성" 등급 회차가 {blockedCount}개 있어요. 판매하려면 해당 회차를 직접 편집해 기여도를 높여야 해요.</span>
              </div>
            )}
          </div>
        )}

        {/* NON-INFRINGEMENT */}
        <button onClick={() => setWarrant((w) => !w)} className="mb-2 flex w-full items-start gap-[11px] rounded-xl border border-hairline bg-white p-[18px] text-left">
          <span className={"flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-[13px] font-bold text-white transition " + (warrant ? "border-[1.5px] border-brand bg-brand" : "border-[1.5px] border-[#d4d4d4] bg-white")}>{warrant ? "✓" : ""}</span>
          <span className="text-[13px] font-bold leading-[1.5] text-ink2">본 작품이 타인의 저작권·상표권을 침해하지 않으며, 위반 시 책임은 본인에게 있음에 동의합니다. (필수)</span>
        </button>
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-5 py-3.5 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          {submitBlocked && blockReason && <div className="mb-2 text-center text-xs font-bold text-muted">{blockReason}</div>}
          <button disabled={submitBlocked} onClick={submit} className={"h-14 w-full rounded border-none text-[17px] font-bold transition " + (submitBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>{submitLabel}</button>
        </div>
      </div>

      {/* demo gate toggle */}
      <div className="fixed right-4 top-[72px] z-40 flex flex-col gap-1 rounded-xl border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
        <DemoSeg active={gateMode === "blocked"} onClick={() => setGateMode("blocked")}>게이트 미달</DemoSeg>
        <DemoSeg active={gateMode === "pass"} onClick={() => setGateMode("pass")}>게이트 통과</DemoSeg>
        <DemoSeg active={gateMode === "review"} onClick={() => setGateMode("review")}>검수 대기</DemoSeg>
      </div>

    </div>
  );
}

function Card({ title, children, anim }: { title?: string; children: React.ReactNode; anim?: boolean }) {
  return (
    <div className="mb-4 rounded-xl border border-hairline bg-white p-[22px]" style={anim ? { animation: "pw-fade .25s ease" } : undefined}>
      {title && <div className="mb-3.5 text-[15px] font-bold">{title}</div>}
      {children}
    </div>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-[7px] pw-field-label">{label}</div>
      <div className="relative">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" className="h-12 w-full rounded border border-hairline pl-3.5 pr-8 text-[15px] font-bold text-ink outline-none focus:border-brand focus:shadow-focus" />
        <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted">원</span>
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
