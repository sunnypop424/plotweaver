import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWizard } from "@/providers/WizardProvider";
import { generateChapter } from "@/lib/api";

type Status = "loading" | "done" | "error";

const TIPS = [
  "생성 후 마음에 안 드는 부분은 부분 수정·재생성할 수 있어요.",
  "관계도에 입력한 회차별 변화가 본문에 자동으로 반영돼요.",
  "1회차가 마음에 들면 바로 다음 회차도 이어서 생성할 수 있어요.",
];

export default function C3GeneratingLoader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: wizData, setChapterContent, reset } = useWizard();
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState(8);
  const [tipIndex, setTipIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [longWait, setLongWait] = useState(false);
  const [currentSeq, setCurrentSeq] = useState(1);
  const [retryTick, setRetryTick] = useState(0);
  const lastRunKeyRef = useRef<string | null>(null);

  // 일괄생성이면 1화부터 총 회차까지 순차 생성, 아니면 1회차만 생성
  const isBatch = wizData.unit === "일괄";
  const total = isBatch ? Math.max(1, wizData.totalChapters || 1) : 1;
  const nextSeqRef = useRef(1);      // 다음에 생성할 회차 (재시도 시 실패 지점부터 이어감)
  const doneCountRef = useRef(0);
  const totalRef = useRef(total);
  totalRef.current = total;

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // navigate state로 novelId를 받아서 context 업데이트 타이밍 race condition 방지
  const novelIdFromState = (location.state as { novelId?: string } | null)?.novelId;
  const novelId = novelIdFromState ?? wizData.novelId;

  // 가짜 진행률 (각 회차 구간의 88%에서 느려지다 멈춤 — 실제 완료되면 다음 구간으로 점프)
  useEffect(() => {
    const progT = window.setInterval(() => {
      if (statusRef.current !== "loading") return;
      setProgress((p) => {
        const sliceSize = 100 / totalRef.current;
        const sliceStart = doneCountRef.current * sliceSize;
        const softCap = sliceStart + sliceSize * 0.88;
        const hardCap = sliceStart + sliceSize * 0.99;
        if (p >= softCap) return Math.min(hardCap, p + 0.3 * (sliceSize / 100));
        return Math.min(softCap, p + (2 + Math.random() * 4) * (sliceSize / 100));
      });
    }, 800);
    const tipT = window.setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3600);
    // 60초 이상 걸리면 "오래 걸리고 있어요" 메시지 표시
    const longT = window.setTimeout(() => {
      if (statusRef.current === "loading") setLongWait(true);
    }, 60_000);
    return () => {
      window.clearInterval(progT);
      window.clearInterval(tipT);
      window.clearTimeout(longT);
    };
  }, []);

  // 실제 API 호출 (novelId 또는 재시도가 바뀔 때만 1회 실행 — StrictMode 이중실행 방지)
  useEffect(() => {
    if (!novelId) return;
    const key = `${novelId}:${retryTick}`;
    if (lastRunKeyRef.current === key) return;
    lastRunKeyRef.current = key;

    (async () => {
      try {
        while (nextSeqRef.current <= total) {
          const seq = nextSeqRef.current;
          setCurrentSeq(seq);
          const res = await generateChapter(novelId, seq);
          if (seq === 1) setChapterContent(res.content);
          doneCountRef.current = seq;
          nextSeqRef.current = seq + 1;
          setProgress(Math.round((doneCountRef.current / total) * 100));
        }
        setProgress(100);
        setStatus("done");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "생성에 실패했어요";
        setErrorMsg(doneCountRef.current > 0 ? `${msg} (${doneCountRef.current}/${total}화까지 생성됨)` : msg);
        setStatus("error");
      }
    })();
  }, [novelId, retryTick]);

  const isLoading = status === "loading";
  const isDone = status === "done";
  const isError = status === "error";
  const pct = Math.round(progress);

  // 88% 이상에서는 카운트다운 대신 안내 문구 표시
  const etaLabel = (() => {
    if (isDone) return "완료";
    if (pct >= 88) return longWait ? "마무리 중... 조금만 더!" : "마무리 중...";
    const etaSec = Math.max(5, Math.round(((88 - progress) / 88) * 40));
    return `예상 약 ${etaSec}초`;
  })();

  const retry = () => {
    setStatus("loading");
    setLongWait(false);
    setErrorMsg("");
    setProgress(Math.max(8, Math.round((doneCountRef.current / total) * 100)));
    setRetryTick((t) => t + 1);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[560px] rounded-xl border border-hairline bg-white px-8 py-9">
        {isLoading && (
          <div className="flex flex-col items-center gap-[18px] text-center">
            <div className="h-8 w-8 rounded-full border-[3px] border-wash border-t-brand" style={{ animation: "pw-spin 1.4s ease-in-out infinite" }} />
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">
              <span className="text-brand">✦</span>{" "}
              {longWait ? "AI가 열심히 집필 중이에요" : isBatch ? `AI가 ${currentSeq}/${total}화를 집필 중입니다` : "AI가 1회차를 집필 중입니다"}
              <span style={{ animation: "pw-pulse 1.4s ease-in-out infinite" }}>…</span>
            </div>
            {longWait && (
              <div className="text-[13px] font-bold text-muted" style={{ animation: "pw-fade .5s ease" }}>
                복잡한 세계관일수록 시간이 더 걸릴 수 있어요
              </div>
            )}
          </div>
        )}
        {isDone && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[28px] font-bold text-white" style={{ animation: "pw-fade .4s ease" }}>✓</div>
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">{isBatch ? `완성! 전체 ${total}화를 확인하세요` : "완성! 1회차를 확인하세요"}</div>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fdecec] text-[30px] font-bold text-error" style={{ animation: "pw-fade .4s ease" }}>!</div>
            <div className="text-2xl font-bold tracking-[-0.3px] text-ink">생성에 실패했어요</div>
            {errorMsg && <div className="text-sm text-muted">{errorMsg}</div>}
            {doneCountRef.current === 0 && (
              <div className="rounded-full bg-wash px-3.5 py-[7px] text-[15px] font-bold text-brand">크레딧은 차감되지 않았어요</div>
            )}
          </div>
        )}

        {(isLoading || isDone) && (
          <div className="mt-[30px]">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[28px] font-bold text-brand">{pct}%</span>
              <span className="text-sm font-bold text-muted">{etaLabel}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-[26px] rounded-lg border border-hairline bg-canvas px-[18px] py-[18px]">
          <div className="mb-3.5 text-xs font-bold tracking-[0.02em] text-muted">입력 요약</div>
          <div className="flex flex-col gap-2.5">
            <SummaryRow label="배경 시대"><span className="text-sm font-bold text-ink">{wizData.era || "—"}</span></SummaryRow>
            <SummaryRow label="장르" align="center">
              <span className="flex flex-wrap gap-1.5">
                {(wizData.genres.length ? wizData.genres : ["—"]).map((g) => (
                  <span key={g} className="inline-flex h-[26px] items-center rounded-full bg-wash px-2.5 text-[13px] font-bold text-brand">{g}</span>
                ))}
              </span>
            </SummaryRow>
            <SummaryRow label="주인공">
              <span className="text-sm font-bold text-ink">
                {wizData.characters.find(c => c.role === "protagonist")?.name || wizData.characters[0]?.name || "—"}
              </span>
            </SummaryRow>
            <div className="my-0.5 h-px bg-hairline" />
            <SummaryRow label="목표"><span className="text-sm text-ink">{wizData.goal || "—"}</span></SummaryRow>
            <SummaryRow label="결말"><span className="text-sm text-ink">{wizData.ending || "—"}</span></SummaryRow>
          </div>
        </div>

        {isLoading && (
          <div className="mt-[22px] flex min-h-[44px] items-center rounded-lg border border-wash bg-[#fbfaff] px-3.5 py-3">
            <div key={tipIndex} className="flex items-center gap-2.5" style={{ animation: "pw-fade .5s ease" }}>
              <span className="flex-shrink-0 rounded-full bg-wash px-[9px] py-1 text-[11px] font-bold tracking-[0.04em] text-brand">TIP</span>
              <span className="text-left text-sm leading-normal text-ink2">{TIPS[tipIndex]}</span>
            </div>
          </div>
        )}
        {isDone && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="text-sm font-bold text-[#2f8f5b]">{isBatch ? `✓ 전체 ${total}화가 저장됐어요` : "✓ 1화가 저장됐어요"}</div>
            <button onClick={() => navigate(`/works/${novelId}/edit`, { replace: true })} className="pw-btn-primary h-14 w-full text-lg">작품 보기 →</button>
            <button onClick={() => { reset(); navigate("/library"); }} className="h-12 w-full rounded border border-line2 bg-white text-[15px] font-bold text-ink2 transition hover:border-brand hover:text-brand">내 작업실로 가기</button>
          </div>
        )}
        {isError && (
          <button onClick={retry} className="pw-btn-slight mt-6 h-14 w-full text-lg">{doneCountRef.current > 0 ? "↻ 이어서 다시 시도" : "↻ 다시 시도"}</button>
        )}
      </div>
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
