/**
 * 작품 카드 (3:4 표지 + 평점/작가/가격 배지). 마켓(M1/M2)에서도 재사용 예정.
 * (WorkCard.dc.html 포팅)
 */
const GRADIENTS = [
  "linear-gradient(155deg,#3b3550 0%,#15131d 100%)",
  "linear-gradient(155deg,#2a3147 0%,#0f1218 100%)",
  "linear-gradient(155deg,#48283c 0%,#16101a 100%)",
  "linear-gradient(155deg,#1f3942 0%,#0e1417 100%)",
  "linear-gradient(155deg,#4a3a5e 0%,#191320 100%)",
];

export type Badge = "paid" | "free" | "tip";

type Props = {
  title: string;
  author: string;
  rating: string;
  price?: string;
  badge?: Badge;
  variant?: number;
  src?: string;
  onOpen?: () => void;
  className?: string;
};

export function WorkCard({ title, author, rating, price = "", badge = "paid", variant = 0, src, onOpen, className = "" }: Props) {
  const bg = GRADIENTS[((variant % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];
  const badgeText = badge === "free" ? "무료" : badge === "tip" ? "후원" : (price || "유료");
  // 호출부가 너비(w-…)를 주면 그걸 쓰고, 없으면 부모(그리드 셀)를 채우도록 w-full.
  const widthCls = /(^|\s)w-/.test(className) ? "" : "w-full";

  return (
    <button onClick={onOpen} className={`block cursor-pointer border-none bg-transparent p-0 text-left ${widthCls} ${className}`}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#1a1a22] shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
        {src ? (
          <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: bg }} />
        )}
        <div className="absolute left-2 top-2 rounded-full bg-black/[0.42] px-2 py-[3px] text-[9px] font-bold text-white">AI 생성</div>
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-3.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0) 100%)" }}>
          <div className="text-base font-bold leading-[1.3] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{title}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {rating && <div className="text-[13px] font-bold text-brand">★ {rating}</div>}
          {author ? (
            <div className="mt-0.5 truncate text-xs text-muted">글 · {author}</div>
          ) : !rating ? (
            <div className="truncate text-xs text-muted">AI 보조 창작</div>
          ) : null}
        </div>
        <span
          className={
            "flex-shrink-0 " +
            (badge === "free"
              ? "rounded-full bg-brand px-[11px] py-1 text-xs font-bold text-white"
              : badge === "tip"
              ? "rounded-full bg-wash px-[11px] py-1 text-xs font-bold text-brand"
              : "text-[13px] font-bold text-ink")
          }
        >
          {badgeText}
        </span>
      </div>
    </button>
  );
}
