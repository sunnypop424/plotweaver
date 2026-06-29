import { useRef, useState } from "react";
import { Toast, useToast } from "../components/Toast";
import { useViewport } from "../lib/useViewport";

type Chapter = { id: number; num: number; title: string; body: string };
type Mode = "read" | "edit";

const INITIAL: Chapter[] = [
  {
    id: 1, num: 1, title: "회귀",
    body:
      "눈을 떴을 때, 카엘은 10년 전으로 돌아와 있었다. 처형대의 차가운 감촉 대신, 손끝에 닿는 것은 낡은 침상의 거친 천이었다.\n\n창밖에서는 새벽 종소리가 울렸다. 그가 마지막으로 들었던 소리는 군중의 환호와, 목을 겨눈 칼날의 울림이었는데.\n\n“……다시.” 카엘은 제 손을 내려다보았다. 흉터 하나 없는, 열일곱의 손이었다. 아직 아무도 죽지 않았고, 아직 아무것도 빼앗기지 않은 시간이었다.\n\n그는 천천히 숨을 골랐다. 분노로 떨던 심장이, 이번에는 차갑게 가라앉았다. 복수는 충동이 아니라 설계여야 했다.\n\n멀리 성의 첨탑 위로 붉은 깃발이 펄럭였다. 제로드의 문장이었다. 카엘은 입꼬리를 올렸다. 이번 생에는, 저 깃발을 내 손으로 끌어내린다.",
  },
  {
    id: 2, num: 2, title: "첫 번째 균열",
    body:
      "리나가 그를 알아본 것은 우연이 아니었다. 같은 새벽, 같은 꿈에서 깨어난 사람의 눈빛은 숨길 수 없는 법이다.\n\n“너도… 돌아왔구나.” 그녀의 목소리가 가늘게 떨렸다. 카엘은 대답 대신 손을 내밀었다. 이번에는, 같은 편에서 시작하기로 했다.",
  },
  {
    id: 3, num: 3, title: "옛 맹세",
    body:
      "맹세는 십 년 전에 깨졌고, 십 년 뒤에 다시 쓰였다. 카엘은 옛 동료의 무덤 앞에서 오래 서 있었다.\n\n“아직 늦지 않았어.” 그는 흙을 한 줌 쥐었다가 천천히 놓았다. 이번에는 누구도 이 자리에 묻지 않겠다고, 그렇게 다짐했다.",
  },
];

export default function C4EditorViewer() {
  const { isMobile, isDesktop } = useViewport();
  const { toast, showToast } = useToast();
  const cid = useRef(3);
  const regenT = useRef<number | undefined>(undefined);
  const genT = useRef<number | undefined>(undefined);

  const [chapters, setChapters] = useState<Chapter[]>(INITIAL);
  const [currentId, setCurrentId] = useState(1);
  const [mode, setMode] = useState<Mode>("read");
  const [regenerating, setRegenerating] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contribution, setContribution] = useState(18);

  const cur = chapters.find((c) => c.id === currentId) ?? chapters[0];

  const selectChapter = (id: number) => { setCurrentId(id); setMode("read"); setDrawerOpen(false); };
  const switchMode = (m: Mode) => {
    if (mode === "edit" && m === "read") showToast("저장됨");
    setMode(m);
  };
  const partialEdit = () => { setMode("edit"); showToast("편집 모드예요. 문장을 직접 다듬어 보세요"); };

  const onBodyChange = (val: string) => {
    setChapters((cs) => cs.map((c) => (c.id === currentId ? { ...c, body: val } : c)));
    setContribution((v) => Math.min(100, v + 2));
  };

  const regenerate = () => {
    if (regenerating) return;
    setRegenerating(true); setMode("read");
    regenT.current = window.setTimeout(() => { setRegenerating(false); showToast("이 회차를 다시 생성했어요"); }, 1500);
  };
  const generateNext = () => {
    if (generatingNext) return;
    setGeneratingNext(true); setDrawerOpen(false);
    genT.current = window.setTimeout(() => {
      const id = ++cid.current;
      setChapters((cs) => [...cs, { id, num: cs.length + 1, title: "새 회차", body: "새 회차의 첫 문장이 화면 위로 흘러내렸다. 카엘의 이야기는 아직 끝나지 않았다.\n\n(AI가 생성한 본문 예시예요 — [부분 수정]과 [재생성]으로 마음껏 다듬어 보세요.)" }]);
      setCurrentId(id); setMode("read"); setGeneratingNext(false);
      showToast("다음 회차를 생성했어요");
    }, 1600);
  };

  const isRead = mode === "read";
  const isEdit = mode === "edit";
  const pct = Math.round(contribution);
  const assisted = pct >= 30;
  const paragraphs = cur.body.split(/\n{2,}/).filter((p) => p.trim().length);
  const isLast = chapters.length > 0 && chapters[chapters.length - 1].id === currentId;

  const chapterList = (
    <>
      <div className="flex flex-col gap-1">
        {chapters.map((c) => {
          const active = c.id === currentId;
          return (
            <button
              key={c.id}
              onClick={() => selectChapter(c.id)}
              className={"flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition " + (active ? "bg-wash text-brand" : "bg-transparent text-ink2 hover:bg-canvas")}
              style={active ? { boxShadow: "inset 3px 0 0 #816bff" } : undefined}
            >
              <span className={"flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold " + (active ? "bg-brand text-white" : "bg-hairline text-muted")}>{c.num}</span>
              <span className="min-w-0 flex-1 truncate text-left">{c.title}</span>
            </button>
          );
        })}
      </div>
      <button onClick={generateNext} className="mt-3 inline-flex h-[42px] w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#b6a9ff] bg-white text-sm font-bold text-brand transition hover:bg-wash">
        + 다음 회차 생성
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* TOP BAR */}
      <div className="sticky top-0 z-[25] flex h-16 items-center justify-between gap-3 border-b border-hairline bg-white px-[18px]">
        <div className="flex min-w-0 items-center gap-2">
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded text-xl text-ink hover:bg-wash">≡</button>
          )}
          <button onClick={() => showToast("작업실로 돌아갑니다")} className="pw-btn-ghost h-[38px] flex-shrink-0 px-2.5 text-sm">← 작업실</button>
          <div className="truncate text-base font-bold text-ink">「회귀한 검, 황혼을 베다」</div>
        </div>
        {!isMobile && (
          <div className="flex flex-shrink-0 gap-2">
            <button onClick={() => showToast("표지 만들기(C5)로 이동합니다")} className="pw-btn-slight h-10 px-3.5 text-sm">표지 만들기</button>
            <button onClick={() => showToast("판매 등록(S2)으로 이동합니다")} className="pw-btn-primary h-10 px-4 text-sm">판매등록</button>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div
        className="mx-auto box-border w-full"
        style={isDesktop ? { display: "flex", gap: 28, alignItems: "flex-start", maxWidth: 1160, padding: "28px 24px 48px" } : { maxWidth: 760, padding: "22px 16px 110px" }}
      >
        {/* SIDEBAR */}
        {!isMobile && (
          <aside className="sticky top-[84px] w-[248px] flex-shrink-0 rounded-xl border border-hairline bg-white px-3 py-4">
            <div className="px-1 pb-2.5 text-xs font-bold tracking-[0.02em] text-muted">회차 {chapters.length}</div>
            {chapterList}
          </aside>
        )}

        {/* CONTENT */}
        <div className={isDesktop ? "min-w-0 flex-1" : "w-full"}>
          <div className="mx-auto w-full" style={{ maxWidth: 712 }}>
            {/* contribution gauge */}
            <div className="pw-card mb-6 px-[18px] py-4">
              <div className="mb-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-ink2">직접 편집 기여도</span>
                  <span className={"rounded-full px-[9px] py-[3px] text-[11px] font-bold " + (assisted ? "bg-wash text-brand" : "bg-[#f2f2f2] text-muted")}>{assisted ? "AI 보조" : "AI 생성"}</span>
                </div>
                <span className="text-sm font-bold text-brand">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2.5 text-xs leading-normal text-muted">판매하려면 직접 편집이 필요해요. 문장을 다듬을수록 게이지가 채워지고 ‘AI 보조’로 바뀌어요.</div>
            </div>

            {/* chapter header + mode toggle */}
            <div className="mb-[18px] flex items-center justify-between gap-3">
              <div className="text-[26px] font-bold tracking-[-0.4px] text-ink">{cur.num}화. {cur.title}</div>
              <div className="flex flex-shrink-0 gap-1 rounded-full bg-[#f2f2f2] p-[3px]">
                <ModeSeg active={isRead} onClick={() => switchMode("read")}>읽기</ModeSeg>
                <ModeSeg active={isEdit} onClick={() => switchMode("edit")}>편집</ModeSeg>
              </div>
            </div>

            {/* body */}
            {regenerating ? (
              <div className="flex flex-col gap-3.5 py-1.5">
                {[96, 100, 88, 70, 93, 80].map((w, i) => (
                  <div key={i} className="pw-skel" style={{ width: `${w}%`, marginBottom: i === 3 ? 10 : 0 }} />
                ))}
              </div>
            ) : isRead ? (
              <div style={{ animation: "pw-fade .3s ease" }}>
                {paragraphs.map((p, i) => (
                  <p key={i} className="mb-5 text-[17px] leading-[1.95] text-[#2c2c2c]">{p}</p>
                ))}
              </div>
            ) : (
              <>
                <textarea
                  value={cur.body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  className="box-border min-h-[420px] w-full resize-y rounded-lg border border-wash-2 bg-[#fbfaff] p-[18px] text-[17px] leading-[1.95] text-[#2c2c2c] outline-none focus:border-brand focus:shadow-focus"
                />
                <div className="mt-2 text-xs text-muted">빈 줄로 문단을 구분해요. 편집하면 기여도가 올라갑니다.</div>
              </>
            )}

            {/* actions */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
              <div className="flex flex-wrap gap-2">
                <button onClick={partialEdit} className="inline-flex h-11 items-center gap-1.5 rounded border border-line2 bg-white px-4 text-sm font-bold text-ink2 transition hover:border-brand hover:bg-canvas hover:text-brand">✎ 부분 수정</button>
                <button onClick={regenerate} className="inline-flex h-11 items-center gap-1.5 rounded border border-line2 bg-white px-4 text-sm font-bold text-ink2 transition hover:border-brand hover:bg-canvas hover:text-brand">↻ 이 회차 재생성</button>
              </div>
              {!isMobile &&
                (generatingNext ? (
                  <button disabled className="inline-flex h-[52px] items-center gap-2 rounded bg-hairline px-6 text-base font-bold text-muted" style={{ cursor: "default" }}>
                    <span className="inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-muted/40 border-t-muted" />
                    생성 중...
                  </button>
                ) : (
                  <button
                    onClick={generateNext}
                    className={"inline-flex h-[52px] items-center gap-2 rounded text-base font-bold transition " + (isLast ? "bg-brand px-[26px] text-white shadow-cta hover:bg-brand-hover" : "bg-wash px-6 text-brand hover:bg-wash-2")}
                  >
                    다음 회차 생성 →
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/50" style={{ animation: "pw-fade .2s ease" }} />
          <div className="fixed inset-y-0 left-0 z-[41] w-[280px] max-w-[84vw] overflow-y-auto bg-white p-[18px] shadow-[2px_0_16px_rgba(0,0,0,0.16)]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">회차 {chapters.length}</span>
              <button onClick={() => setDrawerOpen(false)} className="h-8 w-8 rounded text-lg text-muted">×</button>
            </div>
            {chapterList}
          </div>
        </>
      )}

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <button
            onClick={generateNext}
            disabled={generatingNext}
            className={(generatingNext ? "pw-btn-disabled" : "pw-btn-primary") + " h-[52px] w-full text-base"}
          >
            {generatingNext ? "생성 중..." : "다음 회차 생성 →"}
          </button>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function ModeSeg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={"h-8 rounded-full px-4 text-[13px] font-bold transition-all " + (active ? "bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "bg-transparent text-muted")}
    >
      {children}
    </button>
  );
}
