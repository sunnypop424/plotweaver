import { useState } from "react";
import { useToast } from "@/components/Toast";

type Page = "queue" | "detail" | "reports";
type Confirm = null | "sanction" | "verdict";

const NAV: { key: Page; icon: string; label: string; badge?: number }[] = [
  { key: "queue", icon: "▤", label: "검수 큐", badge: 24 },
  { key: "reports", icon: "⚑", label: "신고 처리", badge: 7 },
  { key: "detail", icon: "▦", label: "검수 상세" },
];
const TITLES: Record<Page, string> = { queue: "O1 · 검수 대시보드", detail: "O2 · 작품 검수 상세", reports: "O3 · 신고 처리" };

type Tone = "neutral" | "danger" | "success" | "brand";
const KPIS: { icon: string; value: string; label: string; trend: string; tone: Tone }[] = [
  { icon: "▤", value: "24", label: "검수 대기", trend: "+5 오늘", tone: "neutral" },
  { icon: "⚑", value: "7", label: "신고 접수", trend: "+2 신규", tone: "danger" },
  { icon: "✓", value: "38", label: "오늘 처리", trend: "▲ 12%", tone: "success" },
  { icon: "◷", value: "12분", label: "평균 처리시간", trend: "▼ 3분", tone: "brand" },
];
const TONE: Record<Tone, { card: string; icon: string; iconBg: string; trendC: string; trendBg: string; val: string; brand?: boolean }> = {
  neutral: { card: "linear-gradient(135deg,#fbfbfd,#fff)", icon: "#505050", iconBg: "#f2f2f4", trendC: "#8a8a8a", trendBg: "#f2f2f4", val: "#121212" },
  danger: { card: "linear-gradient(135deg,#fff6f6,#fff)", icon: "#f16361", iconBg: "#fff1f1", trendC: "#f16361", trendBg: "#fff1f1", val: "#f16361" },
  success: { card: "linear-gradient(135deg,#f4faf6,#fff)", icon: "#2f8f5b", iconBg: "#e8f5ee", trendC: "#2f8f5b", trendBg: "#e8f5ee", val: "#121212" },
  brand: { card: "linear-gradient(135deg,#816bff,#6e58ff)", icon: "#fff", iconBg: "rgba(255,255,255,0.18)", trendC: "#fff", trendBg: "rgba(255,255,255,0.18)", val: "#fff", brand: true },
};

type Prio = "high" | "mid" | "low";
const QUEUE: { prio: Prio; title: string; author: string; type: string; sim: number; reports: number; wait: string }[] = [
  { prio: "high", title: "검은 그림자", author: "user_4821", type: "신규등록", sim: 87, reports: 3, wait: "14분" },
  { prio: "high", title: "금지된 정원", author: "user_2910", type: "신고", sim: 12, reports: 5, wait: "22분" },
  { prio: "mid", title: "별빛 아래서", author: "user_7732", type: "신규등록", sim: 34, reports: 0, wait: "1시간" },
  { prio: "mid", title: "마지막 항해", author: "user_1188", type: "재검수", sim: 8, reports: 1, wait: "2시간" },
  { prio: "low", title: "오후의 카페", author: "user_5521", type: "신규등록", sim: 5, reports: 0, wait: "3시간" },
  { prio: "low", title: "겨울 정류장", author: "user_8843", type: "신규등록", sim: 19, reports: 0, wait: "4시간" },
];
const PRIO: Record<Prio, { l: string; cls: string }> = {
  high: { l: "높음", cls: "text-error bg-error-wash" },
  mid: { l: "보통", cls: "text-[#c98a2b] bg-[#fdf3e2]" },
  low: { l: "낮음", cls: "text-muted bg-[#f2f2f4]" },
};
const QFILTERS = [
  { k: "all", l: "전체" }, { k: "new", l: "신규등록" }, { k: "report", l: "신고" }, { k: "high", l: "높은 우선순위" },
];

export default function OAdminConsole() {
  const { showToast } = useToast();
  const [page, setPage] = useState<Page>("queue");
  const [queueFilter, setQueueFilter] = useState("all");
  const [contentAction, setContentAction] = useState<string | null>(null);
  const [accountAction, setAccountAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictReason, setVerdictReason] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);

  const rows = QUEUE.filter((q) =>
    queueFilter === "new" ? q.type === "신규등록" : queueFilter === "report" ? q.reports > 0 : queueFilter === "high" ? q.prio === "high" : true
  );

  const actionBlocked = !contentAction && !accountAction;
  const verdictBlocked = !verdict;
  const sanctionConfirm = confirm === "sanction";

  const doConfirm = () => {
    const c = confirm;
    setConfirm(null);
    if (c === "sanction") { showToast("제재가 적용되고 작성자에게 통보됐어요"); setPage("queue"); setContentAction(null); setAccountAction(null); setReason(""); }
    else { showToast("판단이 확정되고 양측에 통보됐어요"); setVerdict(null); setVerdictReason(""); }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* SIDE NAV */}
      <div className="sticky top-0 flex h-screen w-[224px] flex-shrink-0 flex-col border-r border-hairline bg-white px-3.5 py-5">
        <div className="flex items-center gap-2 px-2 pb-[22px]">
          <span className="text-[19px] font-bold tracking-[-0.5px] text-brand">플롯위버</span>
          <span className="rounded-full bg-wash px-2 py-[3px] text-[10px] font-bold text-brand">운영</span>
        </div>
        {NAV.map((n) => {
          const on = page === n.key;
          return (
            <button key={n.key} onClick={() => setPage(n.key)} className={"mb-[3px] flex w-full items-center gap-[11px] rounded-lg px-3 py-3 text-left text-sm font-bold transition " + (on ? "bg-wash text-brand" : "bg-transparent text-ink2")}>
              <span className="w-5 text-center text-[15px]">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.badge != null && <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold text-white " + (on ? "bg-brand" : "bg-error")}>{n.badge}</span>}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 border-t border-[#f0f0f0] px-2 py-3">
          <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg,#816bff,#a892ff)" }}>운</span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-ink">운영자_02</div>
            <div className="text-[11px] text-muted">신뢰·안전 팀</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-white px-7">
          <div className="text-lg font-bold tracking-[-0.3px]">{TITLES[page]}</div>
          <div className="flex items-center gap-2 rounded-full bg-[#e8f5ee] px-3 py-1.5 text-xs font-bold text-[#2f8f5b]">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#2f8f5b]" />실시간 동기화 중
          </div>
        </div>

        <div className="w-full p-7">
          {/* O1 QUEUE */}
          {page === "queue" && (
            <div style={{ animation: "pw-fade .2s ease" }}>
              <div className="mb-[22px] grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                {KPIS.map((k) => {
                  const t = TONE[k.tone];
                  return (
                    <div key={k.label} className="rounded-[14px] p-5" style={{ background: t.card, border: t.brand ? "1px solid transparent" : "1px solid #eeeeee", boxShadow: t.brand ? "0 8px 24px rgba(129,107,255,0.3)" : undefined }}>
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-[17px]" style={{ background: t.iconBg, color: t.icon }}>{k.icon}</span>
                        <span className="rounded-full px-[9px] py-1 text-[11px] font-bold" style={{ color: t.trendC, background: t.trendBg }}>{k.trend}</span>
                      </div>
                      <div className="mt-4 text-[32px] font-bold tracking-[-0.5px]" style={{ color: t.val }}>{k.value}</div>
                      <div className="mt-1 text-[13px] font-bold" style={{ color: t.brand ? "rgba(255,255,255,0.82)" : "#8a8a8a" }}>{k.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                {QFILTERS.map((f) => {
                  const on = queueFilter === f.k;
                  return (
                    <button key={f.k} onClick={() => setQueueFilter(f.k)} className={"h-[34px] rounded-full border px-[13px] text-xs font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-[#e3e3e6] bg-white text-ink2")}>{f.l}</button>
                  );
                })}
                <div className="flex-1" />
                <span className="text-xs text-muted">우선순위순 정렬</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-hairline bg-white">
                <div className="flex items-center border-b border-[#e3e3e6] bg-[#fafafa] px-[18px] py-[11px] text-[11px] font-bold text-muted">
                  <div className="w-[70px]">우선순위</div>
                  <div className="min-w-0 flex-[2]">작품 / 작성자</div>
                  <div className="w-[90px]">분류</div>
                  <div className="w-20 text-center">유사도</div>
                  <div className="w-16 text-center">신고</div>
                  <div className="w-[90px] text-right">대기</div>
                </div>
                {rows.map((q, i) => {
                  const p = PRIO[q.prio];
                  const simHigh = q.sim >= 60, simMid = q.sim >= 30 && q.sim < 60;
                  return (
                    <button key={i} onClick={() => setPage("detail")} className="flex w-full items-center border-b border-[#f2f2f4] px-[18px] py-[13px] text-left transition last:border-b-0 hover:bg-[#faf9ff]">
                      <div className="w-[70px]"><span className={"rounded px-[9px] py-[3px] text-[11px] font-bold " + p.cls}>{p.l}</span></div>
                      <div className="min-w-0 flex-[2] pr-2">
                        <div className="truncate text-[13px] font-bold text-ink">{q.title}</div>
                        <div className="mt-px text-[11px] text-muted">{q.author}</div>
                      </div>
                      <div className="w-[90px]"><span className="rounded bg-[#f2f2f4] px-2 py-[3px] text-[11px] font-bold text-ink2">{q.type}</span></div>
                      <div className="w-20 text-center"><span className={"rounded px-2 py-[3px] text-xs font-bold " + (simHigh ? "text-error bg-error-wash" : simMid ? "text-[#c98a2b] bg-[#fdf3e2]" : "text-muted bg-[#f2f2f4]")}>{q.sim}%</span></div>
                      <div className={"w-16 text-center text-[13px] font-bold " + (q.reports > 0 ? "text-error" : "text-[#c4c4c4]")}>{q.reports}</div>
                      <div className="w-[90px] text-right text-xs text-muted">{q.wait}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* O2 DETAIL */}
          {page === "detail" && (
            <div style={{ animation: "pw-fade .2s ease" }}>
              <button onClick={() => setPage("queue")} className="mb-3 border-none bg-transparent py-1.5 text-[13px] font-bold text-brand">← 검수 큐로</button>
              <div className="grid items-start gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>
                {/* content */}
                <div className="flex min-w-0 flex-col gap-3.5">
                  <Panel>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold">「검은 그림자」</div>
                        <div className="mt-1 text-[13px] text-muted">글 · user_4821 · 다크판타지 · 전체 8화 · 등록 2026.06.26</div>
                      </div>
                      <span className="flex-shrink-0 rounded-full bg-[#fdf3e2] px-[11px] py-1 text-[11px] font-bold text-[#c98a2b]">검수중</span>
                    </div>
                    <div className="my-4 h-px bg-[#f2f2f4]" />
                    <div className="mb-2 text-[13px] font-bold text-muted">3화 본문 (신고 회차)</div>
                    <p className="m-0 rounded-lg bg-[#fafafa] p-4 text-sm leading-[1.8] text-[#3a3a3a]">검을 든 그림자가 성벽을 넘었다. 그는 10년 전으로 돌아온 자였다. 처형대의 차가운 감촉 대신, 손끝에 닿는 것은 낡은 침상의 거친 천이었다. 같은 실수를 반복하지 않기 위해, 그는 가장 차가운 검이 되기로 했다…</p>
                  </Panel>

                  <Panel>
                    <div className="mb-3.5 text-sm font-bold">자동 분석 플래그</div>
                    <div className="flex flex-col gap-2.5">
                      <Flag tone="danger" icon="⚠" label="유사도 검사 (F-50)" value="87% — 「회귀한 검」과 유사" />
                      <Flag tone="warn" icon="⚠" label="FDS 이상거래 플래그" value="동일 IP 다중 계정 의심" />
                      <Flag tone="ok" icon="✓" label="유해물 자동필터" value="통과" />
                    </div>
                  </Panel>

                  <Panel>
                    <div className="mb-3 text-sm font-bold">작성자 이력 · user_4821</div>
                    <div className="flex flex-wrap gap-5">
                      <Stat label="가입" value="2026.06.10" />
                      <Stat label="등록 작품" value="3" />
                      <Stat label="누적 신고" value="5건" valueCls="text-error" />
                      <Stat label="제재 이력" value="경고 1회" valueCls="text-[#c98a2b]" />
                    </div>
                  </Panel>
                </div>

                {/* action panel */}
                <div className="sticky top-20 rounded-xl border border-hairline bg-white p-5">
                  <div className="mb-3.5 text-sm font-bold">제재 액션</div>
                  <div className="mb-2 text-[11px] font-bold text-muted">콘텐츠 조치</div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {[{ k: "approve", l: "승인" }, { k: "hide", l: "숨김" }, { k: "delete", l: "삭제" }, { k: "hold", l: "정산보류" }].map((a) => (
                      <ActBtn key={a.k} on={contentAction === a.k} onClick={() => setContentAction(a.k)}>{a.l}</ActBtn>
                    ))}
                  </div>
                  <div className="mb-2 text-[11px] font-bold text-muted">계정 제재</div>
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {[{ k: "warn", l: "경고" }, { k: "suspend", l: "정지" }, { k: "ban", l: "차단" }].map((a) => (
                      <ActBtn key={a.k} on={accountAction === a.k} onClick={() => setAccountAction(a.k)}>{a.l}</ActBtn>
                    ))}
                  </div>
                  <div className="mb-2 text-[11px] font-bold text-muted">처리 사유</div>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="제재 근거를 기록하세요 (작성자에게 통보됨)" className="min-h-[72px] w-full resize-y rounded-lg border border-hairline px-3 py-[11px] text-[13px] leading-[1.5] text-ink outline-none focus:border-brand" />
                  <button disabled={actionBlocked} onClick={() => !actionBlocked && setConfirm("sanction")} className={"mt-3.5 h-12 w-full rounded-md border-none text-sm font-bold transition " + (actionBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-error text-white")}>제재 적용</button>
                  <div className="mt-2 text-center text-[11px] leading-[1.4] text-[#b4b4b4]">불법물은 즉시 삭제 후 수사기관 통보 절차가 진행됩니다.</div>
                </div>
              </div>
            </div>
          )}

          {/* O3 REPORTS */}
          {page === "reports" && (
            <div className="grid items-start gap-4" style={{ gridTemplateColumns: "1fr 320px", animation: "pw-fade .2s ease" }}>
              <div className="min-w-0 rounded-xl border border-hairline bg-white p-5">
                <div className="text-base font-bold">신고 #2026-0626-014</div>
                <div className="mt-1 text-[13px] text-muted">「검은 그림자」 3화 · 사유: 표절·저작권 침해</div>

                <div className="mt-[18px] rounded-lg bg-[#fafafa] px-4 py-3.5">
                  <div className="mb-1.5 text-xs font-bold text-muted">신고자 진술</div>
                  <p className="m-0 text-sm leading-[1.6] text-[#3a3a3a]">제 작품 「회귀한 검」의 1화 도입부를 거의 그대로 베꼈습니다. 회귀 설정과 첫 문장이 동일해요. 캡처 첨부합니다.</p>
                </div>
                <div className="mt-3 rounded-lg bg-wash px-4 py-3.5">
                  <div className="mb-1.5 text-xs font-bold text-brand">작성자 소명 (반론)</div>
                  <p className="m-0 text-sm leading-[1.6] text-[#3a3a3a]">회귀물은 보편적 장르 클리셰이며, 세부 전개와 인물은 다릅니다. AI 생성 과정에서 우연히 유사해진 것으로 의도적 표절이 아닙니다.</p>
                </div>
                <div className="mt-4 rounded-lg border border-[#fcdada] bg-[#fff7f7] px-4 py-3.5">
                  <div className="flex items-center gap-2"><span className="font-bold text-error">⚠</span><span className="text-[13px] font-bold text-[#c0504e]">자동 유사도 87% (F-50) — 도입부 집중</span></div>
                </div>
              </div>

              <div className="sticky top-20 rounded-xl border border-hairline bg-white p-5">
                <div className="mb-3.5 text-sm font-bold">판단</div>
                <div className="mb-4 flex flex-col gap-2">
                  {[{ k: "guilty", l: "위반 확정" }, { k: "innocent", l: "무혐의" }].map((v) => {
                    const on = verdict === v.k;
                    return (
                      <button key={v.k} onClick={() => setVerdict(v.k)} className={"flex w-full items-center gap-[11px] rounded-lg border-[1.5px] px-3.5 py-[13px] text-left transition " + (on ? "border-brand bg-wash" : "border-[#e3e3e6] bg-white")}>
                        <span className="box-border h-[18px] w-[18px] flex-shrink-0 rounded-full" style={{ border: on ? "5px solid #816bff" : "2px solid #d4d4d4" }} />
                        <span className="text-[13px] font-bold text-ink">{v.l}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mb-2 text-[11px] font-bold text-muted">결정 사유 (양측 통보)</div>
                <textarea value={verdictReason} onChange={(e) => setVerdictReason(e.target.value)} placeholder="판단 근거를 기록하세요" className="min-h-[72px] w-full resize-y rounded-lg border border-hairline px-3 py-[11px] text-[13px] leading-[1.5] text-ink outline-none focus:border-brand" />
                <button disabled={verdictBlocked} onClick={() => !verdictBlocked && setConfirm("verdict")} className={"mt-3.5 h-12 w-full rounded-md border-none text-sm font-bold transition " + (verdictBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white")}>판단 확정</button>
                <div className="mt-2 text-center text-[11px] text-[#b4b4b4]">신고자·작성자 양측에 결과가 통보됩니다.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div className="w-full max-w-[380px] rounded-[14px] bg-white p-[26px]" style={{ animation: "pw-pop .22s ease" }}>
            <div className="text-[17px] font-bold text-ink">{sanctionConfirm ? "제재를 적용할까요?" : "판단을 확정할까요?"}</div>
            <div className="mt-2.5 text-sm leading-[1.6] text-ink2">{sanctionConfirm ? "선택한 조치가 즉시 반영되고 작성자에게 사유가 통보됩니다. 되돌릴 수 없어요." : "결정 사유가 신고자와 작성자 양측에 통보됩니다."}</div>
            <div className="mt-[22px] flex gap-2.5">
              <button onClick={() => setConfirm(null)} className="h-12 flex-1 rounded border border-hairline bg-white text-[15px] font-bold text-ink2">취소</button>
              <button onClick={doConfirm} className="h-12 flex-1 rounded border-none text-[15px] font-bold text-white" style={{ background: sanctionConfirm ? "#f16361" : "#816bff" }}>{sanctionConfirm ? "제재 적용" : "확정"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-hairline bg-white p-5">{children}</div>;
}
function Flag({ tone, icon, label, value }: { tone: "danger" | "warn" | "ok"; icon: string; label: string; value: string }) {
  const map = {
    danger: { box: "border-[#fcdada] bg-error-wash", c: "#c0504e", ic: "#f16361" },
    warn: { box: "border-[#f5e0c0] bg-[#fff7ed]", c: "#a06f24", ic: "#c98a2b" },
    ok: { box: "border-[#d4ecd9] bg-[#f3faf5]", c: "#2f8f5b", ic: "#2f8f5b" },
  }[tone];
  return (
    <div className={"flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 " + map.box}>
      <div className="flex items-center gap-[9px]"><span className="font-bold" style={{ color: map.ic }}>{icon}</span><span className="text-[13px] font-bold" style={{ color: map.c }}>{label}</span></div>
      <span className="text-[13px] font-bold" style={{ color: map.c }}>{value}</span>
    </div>
  );
}
function Stat({ label, value, valueCls = "" }: { label: string; value: string; valueCls?: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-muted">{label}</div>
      <div className={"mt-0.5 text-sm font-bold " + valueCls}>{value}</div>
    </div>
  );
}
function ActBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"h-10 rounded-md border text-xs font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-[#e3e3e6] bg-white text-ink2")}>{children}</button>
  );
}
