import { useEffect, useRef, useState } from "react";
import { WizardChrome } from "../components/WizardChrome";
import { Toast, useToast } from "../components/Toast";
import { RadioPill } from "./C1SettingsWizard";
import { useViewport } from "../lib/useViewport";

/* ── 타입 ────────────────────────────────────────────────────────────── */
type Role = "lead" | "villain" | "support";
type Node = { id: number; name: string; role: Role; x: number; y: number };
type TimelineItem = { id: number; ep: number; fromLabel: string; toLabel: string };
type Edge = {
  id: number; from: number; to: number;
  relation: string; relationCustom: boolean;
  direction: "both" | "one"; timeline: TimelineItem[];
};

const RELATION_OPTIONS = ["연인", "원수", "동료", "사제", "형제", "동맹", "배신자"];
const ROLE_META: Record<Role, { border: string; cap: string; label: string }> = {
  lead: { border: "2.5px solid #816bff", cap: "#816bff", label: "주인공" },
  villain: { border: "2.5px solid #242537", cap: "#242537", label: "악역" },
  support: { border: "2px solid #d8d8d8", cap: "#8a8a8a", label: "조연" },
};

export default function C2RelationshipBuilder() {
  const { isMobile, isDesktop } = useViewport();
  const { toast, showToast } = useToast();

  const eid = useRef(2);
  const tid = useRef(2);
  const autoTimer = useRef<number | undefined>(undefined);

  const [nodes, setNodes] = useState<Node[]>([
    { id: 1, name: "카엘", role: "lead", x: 200, y: 250 },
    { id: 2, name: "리나", role: "support", x: 470, y: 150 },
    { id: 3, name: "제로드", role: "villain", x: 430, y: 380 },
  ]);
  const [edges, setEdges] = useState<Edge[]>([
    { id: 1, from: 1, to: 2, relation: "연인", relationCustom: false, direction: "both", timeline: [
      { id: 1, ep: 5, fromLabel: "동료", toLabel: "연인" },
      { id: 2, ep: 12, fromLabel: "연인", toLabel: "원수" },
    ] },
    { id: 2, from: 1, to: 3, relation: "원수", relationCustom: false, direction: "both", timeline: [] },
  ]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(1);
  const [autoLoading, setAutoLoading] = useState(false);

  /* ── 드래그 (canvas 좌표 기준) ───────────────────────────────────────── */
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const canvas = canvasRef.current;
      if (!d || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const r = 48;
      let x = e.clientX - rect.left - d.dx;
      let y = e.clientY - rect.top - d.dy;
      x = Math.max(r, Math.min(rect.width - r, x));
      y = Math.max(r, Math.min(rect.height - r, y));
      setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x, y } : n)));
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);
  useEffect(() => () => window.clearTimeout(autoTimer.current), []);

  /* ── 액션 ──────────────────────────────────────────────────────────── */
  const updateEdge = (id: number, patch: Partial<Edge>) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEdge = (id: number) =>
    setEdges((es) => {
      const next = es.filter((e) => e.id !== id);
      setSelectedEdgeId(next.length ? next[0].id : null);
      return next;
    });
  const addEdge = () => {
    if (nodes.length < 2) return;
    const [a, b] = nodes;
    const id = ++eid.current;
    setEdges((es) => [...es, { id, from: a.id, to: b.id, relation: "동료", relationCustom: false, direction: "both", timeline: [] }]);
    setSelectedEdgeId(id);
  };
  const addTimeline = (edgeId: number) =>
    setEdges((es) => es.map((e) => {
      if (e.id !== edgeId) return e;
      const maxEp = e.timeline.reduce((m, t) => Math.max(m, t.ep || 0), 0);
      return { ...e, timeline: [...e.timeline, { id: ++tid.current, ep: maxEp + 1, fromLabel: "", toLabel: "" }] };
    }));
  const updateTimeline = (edgeId: number, tId: number, patch: Partial<TimelineItem>) =>
    setEdges((es) => es.map((e) => (e.id !== edgeId ? e : { ...e, timeline: e.timeline.map((t) => (t.id === tId ? { ...t, ...patch } : t)) })));
  const removeTimeline = (edgeId: number, tId: number) =>
    setEdges((es) => es.map((e) => (e.id !== edgeId ? e : { ...e, timeline: e.timeline.filter((t) => t.id !== tId) })));

  const autoRecommend = () => {
    setAutoLoading(true);
    autoTimer.current = window.setTimeout(() => {
      const ids = nodes.map((n) => n.id);
      const [k, r, z] = ids;
      const next: Edge[] = [];
      if (k != null && r != null) next.push({ id: ++eid.current, from: k, to: r, relation: "연인", relationCustom: false, direction: "both", timeline: [
        { id: ++tid.current, ep: 5, fromLabel: "동료", toLabel: "연인" },
        { id: ++tid.current, ep: 12, fromLabel: "연인", toLabel: "원수" },
      ] });
      if (k != null && z != null) next.push({ id: ++eid.current, from: k, to: z, relation: "원수", relationCustom: false, direction: "both", timeline: [] });
      setEdges(next);
      setSelectedEdgeId(next.length ? next[0].id : null);
      setAutoLoading(false);
      showToast("AI가 인물 관계를 추천했어요");
    }, 1300);
  };

  /* ── 파생 계산 ─────────────────────────────────────────────────────── */
  const nodeById = (id: number) => nodes.find((n) => n.id === id);
  const curve = 36;
  const enoughNodes = nodes.length >= 2;
  const selEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const edgeGeoms = edges.map((e) => {
    const a = nodeById(e.from), b = nodeById(e.to);
    const selected = e.id === selectedEdgeId;
    let d = "", lx = 0, ly = 0;
    if (a && b) {
      const r = 48;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = a.x + ux * r, sy = a.y + uy * r;
      const ex = b.x - ux * r, ey = b.y - uy * r;
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      const nx = -uy, ny = ux;
      const cx = mx + nx * curve, cy = my + ny * curve;
      d = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
      lx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
      ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
    }
    return { edge: e, selected, d, lx, ly };
  });

  const canvasH = isMobile ? 360 : 500;

  return (
    <div className="min-h-screen bg-canvas">
      <WizardChrome current={3} isMobile={isMobile} onBack={() => showToast("이전 화면으로 돌아갑니다")} onSaveDraft={() => showToast("임시저장됨")} />

      <div
        className="mx-auto box-border w-full"
        style={
          isDesktop
            ? { display: "flex", gap: 32, alignItems: "flex-start", maxWidth: 1120, padding: "32px 24px 56px" }
            : { display: "flex", flexDirection: "column", gap: 16, maxWidth: 680, padding: "24px 16px 132px" }
        }
      >
        {/* ── CANVAS ── */}
        <div className={isDesktop ? "min-w-0 flex-1" : "w-full"}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold tracking-[-0.4px] text-ink">관계도</div>
              <div className="mt-1 text-sm text-muted">3단계 · 인물을 끌어 배치하고, 관계선을 눌러 편집해요.</div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {autoLoading ? (
                <button disabled className="inline-flex h-[38px] items-center gap-2 rounded border border-line2 bg-white px-3.5 text-[13px] font-bold text-brand opacity-70 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ cursor: "default" }}>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                  추천 중...
                </button>
              ) : (
                <button onClick={autoRecommend} className="inline-flex h-[38px] items-center gap-[7px] rounded border border-line2 bg-white px-3.5 text-[13px] font-bold text-brand shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:bg-wash">
                  ✦ 자동 추천
                </button>
              )}
              <button
                onClick={addEdge}
                disabled={!enoughNodes}
                className={
                  "h-[38px] rounded px-3.5 text-[13px] font-bold transition " +
                  (!enoughNodes
                    ? "cursor-default border border-hairline bg-hairline text-muted"
                    : edges.length === 0
                    ? "bg-brand text-white shadow-cta"
                    : "border border-line2 bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.06)]")
                }
              >
                + 관계 추가
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="relative w-full overflow-hidden rounded-xl border border-hairline bg-canvas"
            style={{
              height: canvasH,
              backgroundImage: "radial-gradient(#e6e6ee 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            {/* edges (svg) */}
            <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" style={{ overflow: "visible" }}>
              <defs>
                <marker id="rl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 Z" fill="#b9b9c6" />
                </marker>
                <marker id="rl-arrow-sel" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 Z" fill="#816bff" />
                </marker>
              </defs>
              {edgeGeoms.map(({ edge, selected, d }) => (
                <g key={edge.id}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={22} onClick={() => setSelectedEdgeId(edge.id)} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
                  <path
                    d={d}
                    fill="none"
                    stroke={selected ? "#816bff" : "#c2c2cf"}
                    strokeWidth={selected ? 2.6 : 2}
                    markerEnd={selected ? "url(#rl-arrow-sel)" : "url(#rl-arrow)"}
                    markerStart={edge.direction === "both" ? (selected ? "url(#rl-arrow-sel)" : "url(#rl-arrow)") : undefined}
                    style={{ pointerEvents: "none", transition: "stroke .2s ease" }}
                  />
                </g>
              ))}
            </svg>

            {/* edge labels */}
            {edgeGeoms.map(({ edge, selected, lx, ly }) => (
              <button
                key={edge.id}
                onClick={() => setSelectedEdgeId(edge.id)}
                className={
                  "absolute z-[2] inline-flex h-7 -translate-x-1/2 -translate-y-1/2 items-center rounded-full px-3 text-[13px] font-bold transition-all " +
                  (selected ? "border border-brand bg-brand text-white" : "border border-wash-border bg-wash text-brand")
                }
                style={{ left: lx, top: ly, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}
              >
                {edge.relation || "관계"}
              </button>
            ))}

            {/* nodes */}
            {nodes.map((n) => {
              const m = ROLE_META[n.role];
              return (
                <div
                  key={n.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    drag.current = { id: n.id, dx: e.clientX - rect.left - n.x, dy: e.clientY - rect.top - n.y };
                  }}
                  className="absolute z-[2] flex w-[92px] cursor-grab select-none flex-col items-center"
                  style={{ left: n.x - 46, top: n.y - 46, touchAction: "none" }}
                >
                  <div
                    className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white px-1.5 text-center text-sm font-bold text-ink shadow-card"
                    style={{ border: m.border }}
                  >
                    {n.name}
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-[11px] font-bold" style={{ color: m.cap }}>{m.label}</div>
                </div>
              );
            })}

            {/* empty / guide */}
            {!enoughNodes && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                <div className="text-center text-sm font-bold text-muted">인물을 2명 이상 추가하면<br />관계를 만들 수 있어요</div>
              </div>
            )}
            {enoughNodes && edges.length === 0 && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-[#d2cbff] bg-white/60 px-[26px] py-[22px] text-center">
                <div className="text-sm font-bold text-brand">아직 관계가 없어요</div>
                <div className="mt-1 text-[13px] text-muted">[+ 관계 추가]로 첫 관계를 만들어 보세요</div>
              </div>
            )}

          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-5 flex items-center justify-between gap-3.5">
              <button
                onClick={() => showToast("② 서사설정 단계로 이동합니다")}
                className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand"
              >
                ← 이전: 서사설정
              </button>
              <button
                onClick={() => showToast("④ 출력설정 단계로 이동합니다")}
                className="pw-btn-primary h-14 px-7 text-lg"
              >
                다음: 출력설정 →
              </button>
            </div>
          )}
        </div>

        {/* ── EDIT PANEL ── */}
        <div className={isDesktop ? "w-[336px] flex-shrink-0" : "w-full"}>
          <div className="pw-card p-[22px]">
            <div className="mb-1 text-base font-bold text-ink">관계 편집</div>

            {!selEdge ? (
              <div className="mt-[18px] rounded-lg border border-dashed border-line2 px-[18px] py-7 text-center text-[13px] leading-relaxed text-muted">
                관계선을 누르면<br />여기에서 편집할 수 있어요.
              </div>
            ) : (
              <EdgeEditor
                edge={selEdge}
                nodes={nodes}
                onUpdate={(patch) => updateEdge(selEdge.id, patch)}
                onRemove={() => removeEdge(selEdge.id)}
                onAddTimeline={() => addTimeline(selEdge.id)}
                onUpdateTimeline={(tId, patch) => updateTimeline(selEdge.id, tId, patch)}
                onRemoveTimeline={(tId) => removeTimeline(selEdge.id, tId)}
              />
            )}
          </div>
        </div>
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <button onClick={() => showToast("② 서사설정 단계로 이동합니다")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
          <button onClick={() => showToast("④ 출력설정 단계로 이동합니다")} className="pw-btn-primary h-[54px] flex-1 text-base">다음: 출력설정 →</button>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

/* ── 관계 편집 패널 ────────────────────────────────────────────────────── */
function EdgeEditor({
  edge, nodes, onUpdate, onRemove, onAddTimeline, onUpdateTimeline, onRemoveTimeline,
}: {
  edge: Edge;
  nodes: Node[];
  onUpdate: (patch: Partial<Edge>) => void;
  onRemove: () => void;
  onAddTimeline: () => void;
  onUpdateTimeline: (tId: number, patch: Partial<TimelineItem>) => void;
  onRemoveTimeline: (tId: number) => void;
}) {
  const tl = [...edge.timeline].sort((a, b) => (a.ep || 0) - (b.ep || 0));
  return (
    <>
      <div className="mb-[18px] text-[13px] text-muted">선택한 관계의 양쪽 인물·유형·방향과 회차별 변화를 설정해요.</div>

      {/* From / To */}
      <div className="mb-[18px] grid grid-cols-2 items-end gap-3">
        <NodeSelect label="From" value={edge.from} nodes={nodes} onChange={(v) => onUpdate({ from: v })} />
        <NodeSelect label="To" value={edge.to} nodes={nodes} onChange={(v) => onUpdate({ to: v })} />
      </div>

      {/* 관계 (하이브리드) */}
      <div className="mb-[18px]">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="pw-field-label">관계</span>
          <button onClick={() => onUpdate({ relationCustom: !edge.relationCustom })} className="pw-link text-xs">
            {edge.relationCustom ? "목록에서 선택" : "+ 직접입력"}
          </button>
        </div>
        {edge.relationCustom ? (
          <input value={edge.relation} onChange={(e) => onUpdate({ relation: e.target.value })} placeholder="예: 라이벌" className="pw-input text-[15px]" style={{ height: 46 }} />
        ) : (
          <div className="pw-select-wrap">
            <select value={edge.relation} onChange={(e) => onUpdate({ relation: e.target.value })} className="pw-select text-[15px]" style={{ height: 46 }}>
              {RELATION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="pw-select-caret">▼</span>
          </div>
        )}
      </div>

      {/* 방향 */}
      <div className="mb-5">
        <div className="mb-2 pw-field-label">방향</div>
        <div className="flex gap-2.5">
          <RadioPill selected={edge.direction === "both"} onClick={() => onUpdate({ direction: "both" })}>양방향</RadioPill>
          <RadioPill selected={edge.direction === "one"} onClick={() => onUpdate({ direction: "one" })}>일방향</RadioPill>
        </div>
      </div>

      {/* 관계 변화 타임라인 */}
      <div className="border-t border-hairline pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="pw-field-label">관계 변화 (회차별)</span>
          <button onClick={onAddTimeline} className="pw-btn-slight h-8 px-3 text-[13px]">+ 변화 추가</button>
        </div>

        {tl.length === 0 && (
          <div className="pb-0.5 pt-1.5 text-[13px] text-muted">아직 변화가 없어요. 특정 회차에서 관계가 바뀐다면 추가해 보세요.</div>
        )}

        <div className="flex flex-col gap-2">
          {tl.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border border-hairline bg-canvas p-2">
              <div className="flex flex-shrink-0 items-center gap-[3px]">
                <input
                  type="number"
                  min={1}
                  value={t.ep}
                  onChange={(e) => onUpdateTimeline(t.id, { ep: Number(e.target.value) || 0 })}
                  className="h-9 w-12 rounded border border-line2 bg-white px-1.5 text-center text-sm font-bold text-ink outline-none focus:border-brand"
                />
                <span className="text-[13px] font-bold text-muted">화</span>
              </div>
              <input value={t.fromLabel} onChange={(e) => onUpdateTimeline(t.id, { fromLabel: e.target.value })} placeholder="이전" className="h-9 min-w-0 flex-1 rounded border border-line2 bg-white px-2 text-[13px] text-ink outline-none focus:border-brand" />
              <span className="flex-shrink-0 text-[13px] text-muted">→</span>
              <input value={t.toLabel} onChange={(e) => onUpdateTimeline(t.id, { toLabel: e.target.value })} placeholder="이후" className="h-9 min-w-0 flex-1 rounded border border-line2 bg-white px-2 text-[13px] text-ink outline-none focus:border-brand" />
              <button onClick={() => onRemoveTimeline(t.id)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[15px] text-muted transition hover:bg-error-wash hover:text-error">×</button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onRemove} className="rounded px-1 py-1.5 text-[13px] font-bold text-muted transition hover:bg-error-wash hover:text-error">× 이 관계 삭제</button>
        </div>
      </div>
    </>
  );
}

function NodeSelect({ label, value, nodes, onChange }: { label: string; value: number; nodes: Node[]; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 pw-field-label">{label}</div>
      <div className="pw-select-wrap">
        <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="pw-select text-[15px]" style={{ height: 46 }}>
          {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <span className="pw-select-caret">▼</span>
      </div>
    </div>
  );
}
