import type { ReactNode } from "react";

/** 인증 화면 공통 셸 — 중앙 정렬 로고 + 카드 래퍼. ALogin·ASignup·AFindAccount 공유. */
export function AuthShell({
  subtitle,
  maxWidth = 440,
  back,
  children,
}: {
  subtitle: string;
  maxWidth?: number;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-10">
        <div className="w-full" style={{ maxWidth }}>
          {back}
          <div className="mb-6 text-center">
            <div className="text-[26px] font-bold tracking-[-0.6px] text-brand">플롯위버</div>
            <div className="mt-1.5 text-sm text-muted">{subtitle}</div>
          </div>
          {children}
          <div className="mt-5 text-center text-xs text-[#b4b4b4]">© 2026 플롯위버</div>
        </div>
      </div>
    </div>
  );
}
