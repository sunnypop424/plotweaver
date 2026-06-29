import { coverGradient } from "@/components/CoverTile";

/**
 * 작업실 작품 카드 (D1). 16:9 표지 헤더 + 진행률 + 상태 배지 + 빠른 액션.
 * (LibraryCard.dc.html import 대상 — 디자인 의도대로 신규 구현)
 */
export type WorkStatus = "private" | "public" | "selling";

const STATUS_META: Record<WorkStatus, { label: string; cls: string }> = {
  private: { label: "비공개", cls: "bg-[#f2f2f2] text-muted" },
  public: { label: "공개", cls: "bg-wash text-brand" },
  selling: { label: "판매중", cls: "bg-brand text-white" },
};

type Props = {
  title: string;
  genre: string;
  updated: string;
  done: number;
  total: number;
  status: WorkStatus;
  variant?: number;
  onOpen?: () => void;
  onWrite?: () => void;
  onCover?: () => void;
  onSell?: () => void;
};

export function LibraryCard({ title, genre, updated, done, total, status, variant = 0, onOpen, onWrite, onCover, onSell }: Props) {
  const meta = STATUS_META[status];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-white">
      {/* cover header */}
      <button onClick={onOpen} className="relative block aspect-[16/9] w-full cursor-pointer border-none p-0" style={{ background: coverGradient(variant) }}>
        <span className={"absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold " + meta.cls}>{meta.label}</span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white">{complete ? "완결" : `${done} / ${total}화`}</span>
      </button>

      {/* body */}
      <div className="p-4">
        <div className="truncate text-base font-bold text-ink">{title}</div>
        <div className="mt-1 truncate text-xs text-muted">{genre} · {updated} 수정</div>

        {/* progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted">
            <span>{complete ? "완결" : "집필 진행률"}</span>
            <span className="text-brand">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* actions */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button onClick={onWrite} className="pw-btn-slight h-9 flex-1 px-3 text-[13px]">✎ 이어쓰기</button>
          <button onClick={onCover} className="h-9 rounded border border-line2 bg-white px-3 text-[13px] font-bold text-ink2 transition hover:border-brand hover:text-brand">표지</button>
          <button onClick={onSell} className="h-9 rounded border border-line2 bg-white px-3 text-[13px] font-bold text-ink2 transition hover:border-brand hover:text-brand">
            {status === "selling" ? "판매 관리" : "판매 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
