import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DEV_ROUTES } from "@/devRoutes";

/** 개발용 화면 스위처 — URL 기반. dev 빌드에서만 렌더되며 기본은 접힘. 실서비스 영향 없음. */
export default function DevNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] rounded-full border border-hairline bg-white/95 px-3 py-1.5 text-xs font-bold text-muted shadow-pop backdrop-blur transition hover:text-brand"
        title="개발용 화면 이동"
      >
        ⌗ DEV
      </button>
    );
  }
  return (
    <div className="fixed bottom-4 left-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-2xl border border-hairline bg-white/95 p-1 shadow-pop backdrop-blur">
      <button onClick={() => setOpen(false)} className="rounded-full px-2.5 py-1.5 text-xs font-bold text-muted transition hover:bg-wash hover:text-brand" title="접기">✕</button>
      {DEV_ROUTES.map((r) => {
        const active = pathname === r.path;
        return (
          <button
            key={r.path}
            onClick={() => navigate(r.path)}
            className={"rounded-full px-3 py-1.5 text-xs font-bold transition " + (active ? "bg-brand text-white" : "bg-transparent text-ink2 hover:bg-wash")}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
