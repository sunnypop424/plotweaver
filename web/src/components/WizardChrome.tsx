import type { ReactNode } from "react";

/** 위저드 공통 chrome: 상단 바 + 5스텝 인디케이터 (C0~C4 공유). */

const STEPS = ["세계관", "기본설정", "서사설정", "관계도", "출력설정"];

type Props = {
  /** 현재 단계 (1~5) */
  current: number;
  isMobile: boolean;
  maxWidth?: number;
  onBack: () => void;
  onSaveDraft: () => void;
};

export function WizardChrome({ current, isMobile, maxWidth = 1120, onBack, onSaveDraft }: Props) {
  return (
    <>
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={onBack} className="pw-btn-ghost h-[38px] px-3 text-sm">
          ← 뒤로
        </button>
        <div className="text-lg font-bold tracking-[-0.2px] text-ink">새 작품 만들기</div>
        <button onClick={onSaveDraft} className="pw-btn-slight h-10 px-4 text-sm">
          임시저장
        </button>
      </div>

      {/* STEPPER */}
      <div className="border-b border-hairline bg-white px-5 py-[18px]">
        <div className="mx-auto" style={{ maxWidth }}>
          {isMobile ? (
            <MobileStepper current={current} />
          ) : (
            <DesktopStepper current={current} />
          )}
        </div>
      </div>
    </>
  );
}

function DesktopStepper({ current }: { current: number }) {
  return (
    <div className="flex w-full items-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <Segment key={label} first={i === 0} doneLine={n <= current}>
            <Bubble done={done} active={active}>
              {done ? "✓" : n}
            </Bubble>
            <span
              className={
                "text-[15px] font-bold " +
                (done ? "text-brand" : active ? "text-ink" : "text-muted")
              }
            >
              {label}
            </span>
          </Segment>
        );
      })}
    </div>
  );
}

function Segment({ first, doneLine, children }: { first: boolean; doneLine: boolean; children: ReactNode }) {
  return (
    <>
      {!first && (
        <div className={"mx-3.5 h-0.5 flex-1 " + (doneLine ? "bg-brand" : "bg-hairline")} />
      )}
      <div className="flex flex-shrink-0 items-center gap-2.5">{children}</div>
    </>
  );
}

function Bubble({ done, active, children }: { done: boolean; active: boolean; children: ReactNode }) {
  const cls = done
    ? "bg-wash text-brand"
    : active
    ? "bg-brand text-white"
    : "bg-white text-muted border border-line2";
  return (
    <div className={"flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold " + cls}>
      {children}
    </div>
  );
}

function MobileStepper({ current }: { current: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
            {current}
          </div>
          <span className="text-[15px] font-bold text-ink">{STEPS[current - 1]}</span>
        </div>
        <span className="text-[13px] font-bold text-muted">{current} / {STEPS.length}</span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={"h-1 flex-1 rounded-full " + (i + 1 <= current ? "bg-brand" : "bg-hairline")}
          />
        ))}
      </div>
    </div>
  );
}
