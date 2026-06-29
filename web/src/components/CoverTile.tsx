import type { CSSProperties } from "react";

/**
 * 책 표지 타일 (2:3). 랜딩 히어로 표지월·갤러리·작동원리에서 재사용.
 * variant 별 그라데이션 목업. rotate(deg) 살짝 기울임 + hover lift+glow(.pw-cover).
 * TODO: 실제 AI 표지 렌더가 준비되면 `src` 로 이미지 교체.
 */
export const COVER_GRADIENTS = [
  "linear-gradient(155deg,#3b3550 0%,#15131d 100%)",
  "linear-gradient(155deg,#2a3147 0%,#0f1218 100%)",
  "linear-gradient(155deg,#48283c 0%,#16101a 100%)",
  "linear-gradient(155deg,#1f3942 0%,#0e1417 100%)",
  "linear-gradient(155deg,#4a3a5e 0%,#191320 100%)",
  "linear-gradient(155deg,#3a2f50 0%,#141019 100%)",
  "linear-gradient(155deg,#243f3a 0%,#0e1714 100%)",
  "linear-gradient(155deg,#4a2630 0%,#180e12 100%)",
];

export function coverGradient(variant = 0): string {
  return COVER_GRADIENTS[((variant % COVER_GRADIENTS.length) + COVER_GRADIENTS.length) % COVER_GRADIENTS.length];
}

const GRADIENTS = COVER_GRADIENTS;

type Props = {
  title: string;
  author?: string;
  variant?: number;
  rotate?: number;
  src?: string;
  onOpen?: () => void;
  className?: string;
};

export function CoverTile({ title, author, variant = 0, rotate = 0, src, onOpen, className = "" }: Props) {
  const bg = src ? undefined : GRADIENTS[((variant % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];
  // 호출부가 너비(w-…)를 주면 그걸 쓰고, 없으면 부모를 채우도록 w-full.
  const widthCls = /(^|\s)w-/.test(className) ? "" : "w-full";
  return (
    <button
      onClick={onOpen}
      className={`pw-cover relative block aspect-[2/3] overflow-hidden rounded-lg border-none p-0 ${widthCls} ${className}`}
      style={{ ["--rot" as string]: `${rotate}deg`, background: "#1a1a22", boxShadow: "0 2px 10px rgba(0,0,0,0.18)", cursor: "pointer" } as CSSProperties}
    >
      {src ? (
        <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: bg }} />
      )}
      {/* 미묘한 비네팅·하이라이트로 '진짜 표지' 느낌 */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%)" }} />
      <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-[3px] text-[9px] font-bold text-white">AI 생성</div>
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-3.5 text-left" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0) 100%)" }}>
        <div className="text-[15px] font-bold leading-[1.3] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{title}</div>
        {author && <div className="mt-1 text-[11px] text-white/70">글 · {author}</div>}
      </div>
    </button>
  );
}
