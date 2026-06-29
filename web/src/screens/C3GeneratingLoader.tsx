import { useEffect, useRef, useState } from "react";
import { Toast, useToast } from "../components/Toast";

type Status = "loading" | "done" | "error";

const TIPS = [
  "생성 후 마음에 안 드는 부분은 부분 수정·재생성할 수 있어요.",
  "관계도에 입력한 회차별 변화가 본문에 자동으로 반영돼요.",
  "1회차가 마음에 들면 바로 다음 회차도 이어서 생성할 수 있어요.",
];

export default function C3GeneratingLoader() {
  const { toast, showToast } = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState(8);
  const [tipIndex, setTipIndex] = useState(0);

  // 상태를 인터벌 콜백에서 읽기 위한 ref
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // 진행률 자동 증가 + 팁 로테이션
  useEffect(() => {
    const progT = window.setInterval(() => {
      if (statusRef.current !== "loading") return;
      setProgress((p) => Math.min(100, p + (3 + Math.random() * 6)));
    }, 650);
    const tipT = window.setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3600);
    return () => { window.clearInterval(progT); window.clearInterval(tipT); };
  }, []);

  // 100% 도달 시 완료로 전환
  useEffect(() => {
    if (progress >= 100 && status === "loading") setStatus("done");
  }, [progress, status]);

  const isLoading = status === "loading";
  const isDone = status === "done";
  const isError = status === "error";
  const pct = Math.round(progress);
  const etaSec = Math.max(1, Math.round(((100 - progress) / 100) * 24));

  const goLoading = () => { setStatus("loading"); setProgress(8); };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[560px] rounded-xl border border-hairline bg-white px-8 py-9">
        {/* HEADER */}
        {isLoading && (
          <div className="flex flex-col items-center gap-[18px] text-center">
            <div className="h-8 w-8 rounded-full border-[3px] border-wash border-t-brand" style={{ animation: "pw-spin 1.4s ease-in-out infinite" }} />
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">
              <span className="text-brand">✦</span> AI가 1회차를 집필 중입니다
              <span style={{ animation: "pw-pulse 1.4s ease-in-out infinite" }}>…</span>
            </div>
          </div>
        )}
        {isDone && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[28px] font-bold text-white" style={{ animation: "pw-fade .4s ease" }}>✓</div>
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">완성! 1회차를 확인하세요</div>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fdecec] text-[30px] font-bold text-error" style={{ animation: "pw-fade .4s ease" }}>!</div>
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">생성에 실패했어요</div>
            <div className="rounded-full bg-wash px-3.5 py-[7px] text-[15px] font-bold text-brand">크레딧은 차감되지 않았어요</div>
          </div>
        )}

        {/* PROGRESS */}
        {(isLoading || isDone) && (
          <div className="mt-[30px]">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[28px] font-bold text-brand">{pct}%</span>
              <span className="text-sm font-bold text-muted">{isDone ? "완료" : `예상 약 ${etaSec}초`}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-hairline">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* SETTING SUMMARY (read-only) */}
        <div className="mt-[26px] rounded-lg border border-hairline bg-canvas px-[18px] py-[18px]">
          <div className="mb-3.5 text-xs font-bold tracking-[0.02em] text-muted">입력 요약</div>
          <div className="flex flex-col gap-2.5">
            <SummaryRow label="배경 시대"><span className="text-sm font-bold text-ink">중세 유럽</span></SummaryRow>
            <SummaryRow label="장르" align="center">
              <span className="flex flex-wrap gap-1.5">
                {["회귀", "복수"].map((g) => (
                  <span key={g} className="inline-flex h-[26px] items-center rounded-full bg-wash px-2.5 text-[13px] font-bold text-brand">{g}</span>
                ))}
              </span>
            </SummaryRow>
            <SummaryRow label="주인공">
              <span className="text-sm font-bold text-ink">카엘 <span className="font-normal text-muted">· 리나, 제로드</span></span>
            </SummaryRow>
            <div className="my-0.5 h-px bg-hairline" />
            <SummaryRow label="목표"><span className="text-sm text-ink">복수</span></SummaryRow>
            <SummaryRow label="결말"><span className="text-sm text-ink">복수 완성</span></SummaryRow>
          </div>
        </div>

        {/* FOOTER per state */}
        {isLoading && (
          <div className="mt-[22px] flex min-h-[44px] items-center rounded-lg border border-wash bg-[#fbfaff] px-3.5 py-3">
            <div key={tipIndex} className="flex items-center gap-2.5" style={{ animation: "pw-fade .5s ease" }}>
              <span className="flex-shrink-0 rounded-full bg-wash px-[9px] py-1 text-[11px] font-bold tracking-[0.04em] text-brand">TIP</span>
              <span className="text-left text-sm leading-normal text-ink2">{TIPS[tipIndex]}</span>
            </div>
          </div>
        )}
        {isDone && (
          <button onClick={() => showToast("에디터(C4)로 이동합니다")} className="pw-btn-primary mt-6 h-14 w-full text-lg">작품 보기 →</button>
        )}
        {isError && (
          <button onClick={goLoading} className="pw-btn-slight mt-6 h-14 w-full text-lg">↻ 다시 시도</button>
        )}
      </div>

      {/* DEMO STATE TOGGLE */}
      <div className="mt-[22px] flex items-center justify-center gap-2.5">
        <span className="text-xs font-bold text-muted">데모 상태</span>
        <div className="flex gap-1.5">
          <Seg active={isLoading} onClick={goLoading}>진행</Seg>
          <Seg active={isDone} onClick={() => { setStatus("done"); setProgress(100); }}>완료</Seg>
          <Seg active={isError} onClick={() => setStatus("error")}>실패</Seg>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function SummaryRow({ label, children, align = "baseline" }: { label: string; children: React.ReactNode; align?: "baseline" | "center" }) {
  return (
    <div className="flex gap-3" style={{ alignItems: align }}>
      <span className="w-16 flex-shrink-0 text-[13px] font-bold text-muted">{label}</span>
      {children}
    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-[34px] rounded-full border px-[15px] text-[13px] font-bold transition-all " +
        (active ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")
      }
    >
      {children}
    </button>
  );
}
