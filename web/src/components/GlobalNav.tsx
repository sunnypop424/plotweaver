import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useViewport } from "@/lib/useViewport";
import { useAuth } from "@/providers/AuthProvider";

export function GlobalNav({ active, search }: { active?: "library" | "market"; search?: ReactNode }) {
  const navigate = useNavigate();
  const { isDesktop } = useViewport();
  const { user } = useAuth();

  const nickname = (user?.user_metadata?.nickname as string) || user?.email?.split("@")[0] || "?";
  const avatarChar = nickname.slice(0, 1).toUpperCase();

  const link = (label: string, to: string, on: boolean) => (
    <button
      onClick={() => navigate(to)}
      className={"border-none bg-transparent p-1.5 text-sm font-bold transition-colors hover:text-brand " + (on ? "text-ink" : "text-muted")}
    >
      {label}
    </button>
  );

  return (
    <div className="sticky top-0 z-30 border-b border-hairline bg-white">
      <div className="mx-auto flex h-16 items-center gap-[18px] px-6" style={{ maxWidth: 1180 }}>
        <button onClick={() => navigate("/")} className="flex-shrink-0 border-none bg-transparent text-xl font-bold tracking-[-0.5px] text-brand">
          플롯위버
        </button>
        {isDesktop && (
          <div className="flex flex-shrink-0 items-center gap-5">
            {link("작업실", "/library", active === "library")}
            {link("마켓", "/market", active === "market")}
          </div>
        )}
        {search ?? <div className="flex-1" />}
        <div className="flex flex-shrink-0 items-center gap-3">
          <button
            onClick={() => navigate("/billing")}
            className="rounded px-2.5 py-2 text-[13px] font-bold text-ink2 transition hover:bg-wash hover:text-brand"
          >
            잉크 준비중
          </button>
          <button
            onClick={() => navigate("/me")}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-none bg-brand text-sm font-bold text-white"
          >
            {avatarChar}
          </button>
        </div>
      </div>
    </div>
  );
}
