import { coverGradient } from "@/components/CoverTile";

/**
 * 작업실 작품 카드 (D1). 2:3 표지 한 장.
 * 평소엔 표지 이미지만 노출하고, 마우스 오버 시 제목·진행률·상태·빠른 액션이
 * 어두운 스크림 위로 떠오른다.
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
  src?: string;
  onOpen?: () => void;
  onWrite?: () => void;
  onCover?: () => void;
  onSell?: () => void;
  onDelete?: () => void;
};

export function LibraryCard({ title, genre, updated, done, total, status, variant = 0, src, onOpen, onWrite, onCover, onSell, onDelete }: Props) {
  const meta = STATUS_META[status];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;

  return (
    <div
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-hairline"
      style={{ background: src ? "#1a1a22" : coverGradient(variant) }}
    >
      {/* 표지 이미지 (평소엔 이것만 보인다) */}
      {src && <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" />}

      {/* 카드 전체 클릭 = 열기 (오버레이 버튼들이 위에서 가로챈다) */}
      <button onClick={onOpen} className="absolute inset-0 z-0" aria-label={title + " 열기"} />

      {/* 회차 진행 배지 — 평소에도 살짝 보이는 최소 정보 */}
      <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-0">
        {complete ? "완결" : `${done} / ${total}화`}
      </span>

      {/* HOVER 오버레이 — 제목·정보·액션 */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3.5 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.25) 100%)" }}
      >
        {/* 상단: 상태 배지 + 삭제 */}
        <div className="flex items-start justify-between">
          <span className={"rounded-full px-2.5 py-1 text-[11px] font-bold " + meta.cls}>{meta.label}</span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-[15px] text-white/80 backdrop-blur-[2px] transition hover:bg-black/70 hover:text-white"
              aria-label="삭제"
            >
              ×
            </button>
          )}
        </div>

        {/* 하단: 제목 + 진행률 + 액션 */}
        <div>
          <div className="truncate text-base font-bold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{title}</div>
          <div className="mt-0.5 truncate text-xs text-white/70">{genre} · {updated} 수정</div>

          {/* progress */}
          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white/75">
              <span>{complete ? "완결" : "집필 진행률"}</span>
              <span className="text-white">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* actions */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onWrite?.(); }} className="h-9 flex-1 rounded border-none bg-brand px-3 text-[13px] font-bold text-white transition hover:bg-brand-hover">✎ 이어쓰기</button>
            <button onClick={(e) => { e.stopPropagation(); onCover?.(); }} className="h-9 rounded border border-white/30 bg-white/10 px-3 text-[13px] font-bold text-white transition hover:bg-white/20">표지</button>
            <button onClick={(e) => { e.stopPropagation(); onSell?.(); }} className="h-9 rounded border border-white/30 bg-white/10 px-3 text-[13px] font-bold text-white transition hover:bg-white/20">
              {status === "selling" ? "판매 관리" : "판매 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
