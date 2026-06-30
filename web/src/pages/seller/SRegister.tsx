import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { useWizard } from "@/providers/WizardProvider";
import { listChapters, updateNovel, getNovel } from "@/lib/api";

type Visibility = "private" | "free" | "paid";
type Rating = "all" | "15" | "19";

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

export default function SRegister() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: wizData } = useWizard();

  const stateData = location.state as { novelId?: string; title?: string } | null;
  const novelId = stateData?.novelId ?? wizData.novelId ?? "";
  const [novelTitle, setNovelTitle] = useState(stateData?.title ?? wizData.title ?? "");

  const [chapters, setChapters] = useState<{ seq: number; wordCount: number }[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [visibility, setVisibility] = useState<Visibility>("paid");
  const [bundlePrice, setBundlePrice] = useState("3,000");
  const [unitPrice, setUnitPrice] = useState("120");
  const [previewCount, setPreviewCount] = useState(2);
  const [rating, setRating] = useState<Rating>("all");
  const [warrant, setWarrant] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!novelId) return;
    setLoadingChapters(true);
    const tasks: Promise<unknown>[] = [listChapters(novelId)];
    if (!novelTitle) {
      tasks.push(getNovel(novelId).then((n) => { setNovelTitle(n.title); }));
    }
    Promise.all(tasks)
      .then(([chaps]) => {
        const rows = chaps as { seq: number; content: string }[];
        setChapters(rows.map((c) => ({
          seq: c.seq,
          wordCount: Math.round(c.content.replace(/\s+/g, "").length / 2),
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingChapters(false));
  }, [novelId]);

  const isPaid = visibility === "paid";

  const submitBlocked = !warrant || submitting || submitted;
  const blockReason = submitted
    ? "등록이 완료됐어요."
    : !warrant
    ? "비침해 보증에 동의해 주세요."
    : "";

  const submitLabel = submitted
    ? "등록 완료"
    : !isPaid
    ? visibility === "free"
      ? "무료로 공개하기"
      : "비공개로 저장하기"
    : "판매 등록하기";

  const submit = async () => {
    if (submitBlocked || !novelId) return;
    setSubmitting(true);
    try {
      const newStatus = visibility === "private" ? "draft" : visibility === "free" ? "public" : "selling";
      await updateNovel(novelId, { status: newStatus });
      setSubmitted(true);
      const msg = isPaid
        ? "검수 큐에 등록했어요. 결과는 알림으로 알려드려요"
        : visibility === "free"
        ? "무료로 공개됐어요"
        : "비공개로 저장됐어요";
      showToast(msg);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const onSave = async () => {
    if (!novelId) { showToast("임시저장됨"); return; }
    try {
      await updateNovel(novelId, { status: "draft" });
      showToast("임시저장됐어요");
    } catch {
      showToast("저장 실패");
    }
  };

  const editHref = novelId ? `/works/${novelId}/edit` : "/library";

  return (
    <div className="min-h-screen bg-canvas">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="text-base font-bold">작품 판매 등록</div>
        <button onClick={onSave} className="pw-btn-slight h-10 px-4 text-sm">임시저장</button>
      </div>

      <div className="mx-auto px-5 pb-[120px] pt-7" style={{ maxWidth: 680 }}>
        <div className="mb-[22px]">
          <div className="text-2xl font-bold tracking-[-0.5px]">{novelTitle ? `「${novelTitle}」` : "작품"}</div>
          <div className="mt-[5px] text-sm text-muted">판매 등록 전, 공개 설정과 창작 기여를 확인해요.</div>
        </div>

        {/* VISIBILITY */}
        <Card title="공개 범위">
          <div className="flex flex-col gap-2.5">
            {VIS_DEFS.map((v) => {
              const on = visibility === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setVisibility(v.key)}
                  className={"flex w-full items-center gap-[13px] rounded-[10px] border-[1.5px] p-[15px] text-left transition " + (on ? "border-brand bg-wash" : "border-hairline bg-white")}
                >
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
            <span className="flex-shrink-0 rounded-full bg-wash px-3.5 py-1.5 text-[13px] font-bold text-brand">AI 보조</span>
          </div>
        </Card>

        {/* CONTRIBUTION GATE (paid only) */}
        {isPaid && (
          <div className="mb-4 rounded-xl border border-[#d4ecd9] bg-[#f3faf5] p-[22px]">
            <div className="mb-1.5 flex items-center gap-[9px]">
              <span className="text-[15px] font-bold text-[#2f8f5b]">창작 기여 점검</span>
              <span className="rounded-full px-2.5 py-[3px] text-[11px] font-bold text-white" style={{ background: "#2f8f5b" }}>통과</span>
            </div>
            <div className="mb-4 text-[13px] leading-[1.6] text-[#5a7d68]">
              모든 회차가 "AI 보조" 등급 이상이에요. 판매 등록할 수 있어요.
            </div>

            <div className="overflow-hidden rounded-[10px] border border-hairline bg-white">
              {loadingChapters ? (
                <div className="flex items-center justify-center py-8">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-brand" />
                </div>
              ) : chapters.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-muted">생성된 회차가 없어요.</div>
              ) : (
                chapters.map((c) => (
                  <div key={c.seq} className="flex items-center justify-between gap-3 border-b border-[#f4f4f4] px-4 py-[13px] last:border-b-0">
                    <div className="flex min-w-0 items-center gap-[11px]">
                      <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-wash text-sm font-bold text-brand">✓</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink">{c.seq}화</div>
                        <div className="mt-px text-xs text-muted">약 {c.wordCount.toLocaleString()}자</div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5">
                      <span className="rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-brand">AI 보조</span>
                      <button
                        onClick={() => navigate(editHref)}
                        className="whitespace-nowrap rounded bg-wash px-2.5 py-[7px] text-xs font-bold text-brand transition hover:bg-wash-2"
                      >
                        편집 →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* NON-INFRINGEMENT */}
        <button
          onClick={() => setWarrant((w) => !w)}
          className="mb-2 flex w-full items-start gap-[11px] rounded-xl border border-hairline bg-white p-[18px] text-left"
        >
          <span className={"flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-[13px] font-bold text-white transition " + (warrant ? "border-[1.5px] border-brand bg-brand" : "border-[1.5px] border-[#d4d4d4] bg-white")}>
            {warrant ? "✓" : ""}
          </span>
          <span className="text-[13px] font-bold leading-[1.5] text-ink2">본 작품이 타인의 저작권·상표권을 침해하지 않으며, 위반 시 책임은 본인에게 있음에 동의합니다. (필수)</span>
        </button>
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-5 py-3.5 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          {submitBlocked && blockReason && (
            <div className="mb-2 text-center text-xs font-bold text-muted">{blockReason}</div>
          )}
          <button
            disabled={submitBlocked}
            onClick={submit}
            className={"h-14 w-full rounded border-none text-[17px] font-bold transition " + (submitBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}
          >
            {submitting ? "처리 중..." : submitLabel}
          </button>
        </div>
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
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          className="h-12 w-full rounded border border-hairline pl-3.5 pr-8 text-[15px] font-bold text-ink outline-none focus:border-brand focus:shadow-focus"
        />
        <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted">원</span>
      </div>
    </div>
  );
}
