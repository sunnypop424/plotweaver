import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { RadioPill } from "@/components/ui/RadioPill";
import { useViewport } from "@/lib/useViewport";
import { useCanvasDrag } from "@/lib/useCanvasDrag";
import { useWizard } from "@/providers/WizardProvider";
import { suggestRelations } from "@/lib/api";

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

function roleFromChar(role: string): "lead" | "villain" | "support" {
  if (role === "protagonist") return "lead";
  if (role === "villain") return "villain";
  return "support";
}

function initNodesFromChars(chars: { name: string; role: string }[]): Node[] {
  if (!chars.length) return [
    { id: 1, name: "주인공", role: "lead", x: 300, y: 250 },
  ];
  const cx = 300, cy = 250, r = 160;
  return chars.map((c, i) => {
    const angle = (2 * Math.PI * i / chars.length) - Math.PI / 2;
    return {
      id: i + 1,
      name: c.name || `인물 ${i + 1}`,
      role: roleFromChar(c.role),
      x: chars.length === 1 ? cx : Math.round(cx + r * Math.cos(angle)),
      y: chars.length === 1 ? cy : Math.round(cy + r * Math.sin(angle)),
    };
  });
}

export default function C2RelationshipBuilder() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { saveRelations, data: wizData } = useWizard();

  const eid = useRef(Math.max(10, wizData.relationships.length + 10));
  const tid = useRef(Math.max(10, ...wizData.relationships.flatMap((r) => r.timeline.map((_, j) => j + 11)), 10));
  const autoTimer = useRef<number | undefined>(undefined);

  const [nodes, setNodes] = useState<Node[]>(() => initNodesFromChars(wizData.characters));
  const [edges, setEdges] = useState<Edge[]>(() => {
    if (!wizData.relationships.length) return [];
    const nodeList = initNodesFromChars(wizData.characters);
    return wizData.relationships.flatMap((r, i) => {
      const fn = nodeList.find((n) => n.name === r.fromChar);
      const tn = nodeList.find((n) => n.name === r.toChar);
      if (!fn || !tn) return [];
      return [{
        id: i + 11,
        from: fn.id, to: tn.id,
        relation: r.relation ?? "동료",
        relationCustom: r.relation ? !RELATION_OPTIONS.includes(r.relation) : false,
        direction: r.direction,
        timeline: r.timeline.map((t, j) => ({ id: j + 11, ep: t.ep, fromLabel: t.fromLabel, toLabel: t.toLabel })),
      }];
    });
  });
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  /* ── 드래그/탭 구분 + ESC (공통 훅: 노드 반지름 48) ──────────────────── */
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { movedRef, startDrag } = useCanvasDrag({
    canvasRef, halfW: 48, halfH: 48,
    onDrag: (id, x, y) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n))),
    onEscape: () => clearSelection(),
  });
  useEffect(() => () => window.clearTimeout(autoTimer.current), []);

  /* ── 선택 / 연결 ───────────────────────────────────────────────────── */
  const clearSelection = () => { setSelectedNodeId(null); setSelectedEdgeId(null); };

  const selectEdge = (id: number) => { setSelectedEdgeId(id); setSelectedNodeId(null); };

  const createOrSelectEdge = (aId: number, bId: number) => {
    const existing = edges.find(
      (e) => (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)
    );
    if (existing) { selectEdge(existing.id); return; }
    const id = ++eid.current;
    setEdges((es) => [...es, { id, from: aId, to: bId, relation: "동료", relationCustom: false, direction: "both", timeline: [] }]);
    selectEdge(id);
    showToast("관계를 만들었어요 · 오른쪽에서 유형을 정해보세요");
  };

  const onNodeTap = (id: number) => {
    if (selectedNodeId === null) {
      // 처음 선택(또는 관계선 편집 중) → 해당 인물의 관계 목록 표시 & 연결 대기
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
    } else if (selectedNodeId === id) {
      // 같은 인물 다시 누르면 해제
      setSelectedNodeId(null);
    } else {
      // 다른 인물을 누르면 관계 생성/이동
      createOrSelectEdge(selectedNodeId, id);
    }
  };

  /* ── 관계 / 타임라인 편집 ──────────────────────────────────────────── */
  const updateEdge = (id: number, patch: Partial<Edge>) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEdge = (id: number) =>
    setEdges((es) => {
      const next = es.filter((e) => e.id !== id);
      setSelectedEdgeId(null);
      return next;
    });
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

  const autoRecommend = async (prompt?: string) => {
    if (nodes.length < 2) { showToast("인물이 2명 이상 필요해요"); return; }
    setAutoLoading(true);
    clearSelection();
    try {
      const characters = nodes.map((n) => ({
        name: n.name,
        role: n.role === "lead" ? "protagonist" : n.role === "villain" ? "villain" : "supporting",
        personality: wizData.characters.find((c) => c.name === n.name)?.personality ?? "",
        trait: wizData.characters.find((c) => c.name === n.name)?.trait ?? "",
        appearance: "",
      }));
      const nodeIndex = (id: number) => nodes.findIndex((n) => n.id === id);
      const existingEdges = edges
        .map((e) => ({ fromIndex: nodeIndex(e.from), toIndex: nodeIndex(e.to), relation: e.relation, direction: e.direction, timeline: e.timeline.map((t) => ({ ep: t.ep, fromLabel: t.fromLabel, toLabel: t.toLabel })) }))
        .filter((e) => e.fromIndex !== -1 && e.toIndex !== -1);
      const res = await suggestRelations({
        characters,
        goal: wizData.goal,
        conflict: wizData.conflict,
        totalChapters: wizData.totalChapters,
        storyFlow: wizData.storyFlow,
        prompt: prompt?.trim() || undefined,
        existingEdges: existingEdges.length ? existingEdges : undefined,
      });
      const newEdges: Edge[] = res.edges
        .filter((e) => nodes[e.fromIndex] && nodes[e.toIndex])
        .map((e) => ({
          id: ++eid.current,
          from: nodes[e.fromIndex].id,
          to: nodes[e.toIndex].id,
          relation: e.relation,
          relationCustom: false,
          direction: e.direction,
          timeline: e.timeline.map((t) => ({ id: ++tid.current, ep: t.ep, fromLabel: t.fromLabel, toLabel: t.toLabel })),
        }));
      setEdges(newEdges);
      showToast(prompt?.trim() ? "프롬프트로 관계도를 반영했어요" : "AI가 인물 관계를 추천했어요");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "AI 생성 실패");
    } finally {
      setAutoLoading(false);
    }
  };

  /* ── 파생 계산 ─────────────────────────────────────────────────────── */
  const nodeById = (id: number) => nodes.find((n) => n.id === id);
  const curve = 36;
  const enoughNodes = nodes.length >= 2;
  const selEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;
  const selNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const edgeGeoms = edges.map((e) => {
    const a = nodeById(e.from), b = nodeById(e.to);
    const selected = e.id === selectedEdgeId;
    // 연결 대기 중인 인물에 닿는 선은 은은하게 강조
    const incident = selectedNodeId != null && (e.from === selectedNodeId || e.to === selectedNodeId);
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
    return { edge: e, selected, incident, d, lx, ly };
  });

  const canvasH = isMobile ? 360 : 500;

  return (
    <>

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
          <div className="mb-5">
            <div className="text-2xl font-bold tracking-[-0.4px] text-ink">관계도</div>
            <div className="mt-1 text-sm text-muted">3단계 · 인물을 클릭한 뒤 다른 인물을 클릭하면 관계가 생겨요. 선을 누르면 편집할 수 있어요.</div>
          </div>

          <div
            ref={canvasRef}
            onClick={() => { if (!movedRef.current) clearSelection(); }}
            className="relative w-full overflow-hidden rounded-xl border border-hairline bg-canvas"
            style={{
              height: canvasH,
              backgroundImage: "radial-gradient(#e6e6ee 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            {/* 연결 대기 안내 배너 */}
            {selNode && (
              <div className="pointer-events-auto absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand/30 bg-white/95 px-3.5 py-1.5 text-[12.5px] font-bold text-brand shadow-[0_2px_10px_rgba(0,0,0,0.08)]" style={{ whiteSpace: "nowrap" }}>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
                <b>{selNode.name}</b> 선택됨 · 다른 인물을 클릭해 관계 만들기
                <button onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }} className="ml-1 text-muted transition hover:text-ink">✕</button>
              </div>
            )}

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
              {edgeGeoms.map(({ edge, selected, incident, d }) => (
                <g key={edge.id}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={22} onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); }} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
                  <path
                    d={d}
                    fill="none"
                    stroke={selected ? "#816bff" : incident ? "#a89bff" : "#c2c2cf"}
                    strokeWidth={selected ? 2.6 : incident ? 2.4 : 2}
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
                onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); }}
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
              const armed = selectedNodeId === n.id;
              const dimmed = selectedNodeId != null && !armed;
              return (
                <div
                  key={n.id}
                  onPointerDown={(e) => { e.preventDefault(); startDrag(e, n.id, n.x, n.y); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (movedRef.current) { movedRef.current = false; return; }
                    onNodeTap(n.id);
                  }}
                  className="absolute z-[2] flex w-[92px] cursor-grab select-none flex-col items-center"
                  style={{ left: n.x - 46, top: n.y - 46, touchAction: "none", transition: "opacity .2s ease" }}
                >
                  <div
                    className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white px-1.5 text-center text-sm font-bold text-ink shadow-card transition-transform"
                    style={{
                      border: m.border,
                      opacity: dimmed ? 0.55 : 1,
                      transform: armed ? "scale(1.06)" : "scale(1)",
                      boxShadow: armed ? "0 0 0 4px rgba(129,107,255,0.25), 0 6px 16px rgba(0,0,0,0.12)" : undefined,
                    }}
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
            {enoughNodes && edges.length === 0 && !selNode && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-[#d2cbff] bg-white/60 px-[26px] py-[22px] text-center">
                <div className="text-sm font-bold text-brand">아직 관계가 없어요</div>
                <div className="mt-1 text-[13px] text-muted">인물을 클릭한 뒤 다른 인물을 클릭해 보세요</div>
              </div>
            )}

            {/* 자동 추천 (플로팅) */}
            {enoughNodes && (
              autoLoading ? (
                <button disabled onClick={(e) => e.stopPropagation()} className="absolute bottom-3.5 right-3.5 z-[3] inline-flex h-[40px] items-center gap-2 rounded-full border border-line2 bg-white px-4 text-[13px] font-bold text-brand opacity-80 shadow-[0_3px_12px_rgba(0,0,0,0.12)]" style={{ cursor: "default" }}>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                  추천 중...
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); autoRecommend(); }} className="absolute bottom-3.5 right-3.5 z-[3] inline-flex h-[40px] items-center gap-[7px] rounded-full border border-brand/25 bg-white px-4 text-[13px] font-bold text-brand shadow-[0_3px_12px_rgba(0,0,0,0.12)] transition hover:bg-wash">
                  ✦ 자동 추천
                </button>
              )
            )}

          </div>

          {/* AI 프롬프트로 관계 설정 */}
          <div className="pw-card mt-4 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink">✦ 프롬프트로 관계 설정</div>
            <div className="mb-2 text-[12.5px] leading-relaxed text-muted">
              문장으로 설명하면 AI가 관계도를 만들거나 고쳐요. 예: <span className="text-ink2">"{"주인공과 라이벌은 첫사랑이었다가 배신으로 원수가 돼요. 나머지는 알아서 채워줘"}"</span>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder={"예: 주인공과 조연은 스승과 제자 관계로 시작해서 8화쯤 배신으로 틀어져요.\n마음에 안 드는 부분이 있으면 다시 여기에 어떻게 바꿀지 적어주세요."}
              className="w-full resize-none rounded-lg border border-hairline px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/50 focus:border-brand focus:shadow-focus"
            />
            <div className="mt-2.5 flex justify-end">
              <button
                onClick={() => autoRecommend(aiPrompt)}
                disabled={autoLoading || !enoughNodes}
                className="pw-btn-primary h-10 px-4 text-[13px] disabled:cursor-default disabled:opacity-50"
              >
                {autoLoading ? "생성 중..." : edges.length > 0 ? "프롬프트로 수정하기" : aiPrompt.trim() ? "프롬프트로 관계 생성" : "자동으로 관계 채우기"}
              </button>
            </div>
          </div>

          {/* DESKTOP nav */}
          {!isMobile && (
            <div className="mt-5 flex items-center justify-between gap-3.5">
              <button
                onClick={() => navigate("/create")}
                className="h-14 rounded border border-line2 bg-white px-[22px] text-base font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand"
              >
                ← 이전: 기본설정
              </button>
              <button
                onClick={() => { saveRelations(edges.map(e => { const fn = nodes.find(n => n.id === e.from); const tn = nodes.find(n => n.id === e.to); return { fromChar: fn?.name ?? "", toChar: tn?.name ?? "", relation: e.relation, direction: e.direction, timeline: e.timeline.map(t => ({ ep: t.ep, fromLabel: t.fromLabel, toLabel: t.toLabel })) }; })); navigate("/create/narrative"); }}
                className="pw-btn-primary h-14 px-7 text-lg"
              >
                다음: 서사설정 →
              </button>
            </div>
          )}
        </div>

        {/* ── EDIT PANEL ── */}
        <div className={isDesktop ? "w-[336px] flex-shrink-0" : "w-full"}>
          <div className="pw-card p-[22px]">
            {selEdge ? (
              <EdgeEditor
                edge={selEdge}
                nodes={nodes}
                onUpdate={(patch) => updateEdge(selEdge.id, patch)}
                onRemove={() => removeEdge(selEdge.id)}
                onAddTimeline={() => addTimeline(selEdge.id)}
                onUpdateTimeline={(tId, patch) => updateTimeline(selEdge.id, tId, patch)}
                onRemoveTimeline={(tId) => removeTimeline(selEdge.id, tId)}
                onBack={clearSelection}
              />
            ) : selNode ? (
              <NodePanel
                node={selNode}
                nodes={nodes}
                edges={edges}
                onSelectEdge={selectEdge}
                onCreateEdge={(otherId) => createOrSelectEdge(selNode.id, otherId)}
                onBack={clearSelection}
              />
            ) : (
              <OverviewPanel nodes={nodes} edges={edges} onSelectEdge={selectEdge} />
            )}
          </div>
        </div>
      </div>

      {/* MOBILE fixed bar */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <button onClick={() => navigate("/create")} className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2">← 이전</button>
          <button onClick={() => { saveRelations(edges.map(e => { const fn = nodes.find(n => n.id === e.from); const tn = nodes.find(n => n.id === e.to); return { fromChar: fn?.name ?? "", toChar: tn?.name ?? "", relation: e.relation, direction: e.direction, timeline: e.timeline.map(t => ({ ep: t.ep, fromLabel: t.fromLabel, toLabel: t.toLabel })) }; })); navigate("/create/narrative"); }} className="pw-btn-primary h-[54px] flex-1 text-base">다음: 서사설정 →</button>
        </div>
      )}

    </>
  );
}

/* ── 공통: 인물 칩 ─────────────────────────────────────────────────────── */
function NodeChip({ node }: { node: Node }) {
  const m = ROLE_META[node.role];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line2 bg-white px-2.5 py-1 text-[13px] font-bold text-ink">
      <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: m.cap }} />
      {node.name}
    </span>
  );
}

/* ── 선택 없음: 전체 관계 목록 ─────────────────────────────────────────── */
function OverviewPanel({ nodes, edges, onSelectEdge }: { nodes: Node[]; edges: Edge[]; onSelectEdge: (id: number) => void }) {
  const nodeById = (id: number) => nodes.find((n) => n.id === id);
  return (
    <>
      <div className="mb-1 text-base font-bold text-ink">관계 편집</div>
      <div className="mb-[18px] text-[13px] leading-relaxed text-muted">
        인물을 클릭하면 <b className="text-ink2">그 인물의 관계</b>가, 관계선을 클릭하면 <b className="text-ink2">상세 편집</b>이 여기에 열려요.
      </div>

      {edges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line2 px-[18px] py-7 text-center text-[13px] leading-relaxed text-muted">
          아직 관계가 없어요.<br />캔버스에서 인물을 클릭한 뒤<br />다른 인물을 클릭해 만들어 보세요.
        </div>
      ) : (
        <>
          <div className="mb-2 pw-field-label">전체 관계 ({edges.length})</div>
          <div className="flex flex-col gap-2">
            {edges.map((e) => {
              const a = nodeById(e.from), b = nodeById(e.to);
              if (!a || !b) return null;
              return (
                <button
                  key={e.id}
                  onClick={() => onSelectEdge(e.id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-left transition hover:border-brand hover:bg-wash"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-ink">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted">{e.direction === "both" ? "⇄" : "→"}</span>
                    <span className="truncate">{b.name}</span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-wash px-2 py-0.5 text-[12px] font-bold text-brand">{e.relation || "관계"}</span>
                    <span className="text-muted">›</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

/* ── 인물 선택: 그 인물의 관계 목록 ────────────────────────────────────── */
function NodePanel({
  node, nodes, edges, onSelectEdge, onCreateEdge, onBack,
}: {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  onSelectEdge: (id: number) => void;
  onCreateEdge: (otherId: number) => void;
  onBack: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const myEdges = edges.filter((e) => e.from === node.id || e.to === node.id);
  const partnerOf = (e: Edge) => nodes.find((n) => n.id === (e.from === node.id ? e.to : e.from));
  const connectedIds = new Set(myEdges.flatMap((e) => [e.from, e.to]));
  const candidates = nodes.filter((n) => n.id !== node.id && !connectedIds.has(n.id));

  return (
    <>
      <button onClick={onBack} className="pw-link mb-2 text-xs">‹ 전체 보기</button>
      <div className="mb-1 flex items-center gap-2">
        <NodeChip node={node} />
        <span className="text-[13px] font-bold text-muted">{ROLE_META[node.role].label}</span>
      </div>
      <div className="mb-[18px] text-[13px] text-muted">이 인물의 관계 {myEdges.length}개</div>

      {myEdges.length === 0 ? (
        <div className="mb-3 rounded-lg border border-dashed border-line2 px-[18px] py-6 text-center text-[13px] leading-relaxed text-muted">
          아직 관계가 없어요.<br />아래에서 상대를 골라 추가하거나,<br />캔버스에서 다른 인물을 클릭하세요.
        </div>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          {myEdges.map((e) => {
            const p = partnerOf(e);
            if (!p) return null;
            return (
              <button
                key={e.id}
                onClick={() => onSelectEdge(e.id)}
                className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-left transition hover:border-brand hover:bg-wash"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-ink">
                  <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ROLE_META[p.role].cap }} />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-wash px-2 py-0.5 text-[12px] font-bold text-brand">{e.relation || "관계"}</span>
                  <span className="text-muted">›</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 빠른 추가 */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          disabled={candidates.length === 0}
          className={
            "w-full rounded-lg border border-dashed py-2.5 text-[13px] font-bold transition " +
            (candidates.length === 0
              ? "cursor-default border-hairline text-muted"
              : "border-brand/40 text-brand hover:bg-wash")
          }
        >
          {candidates.length === 0 ? "모든 인물과 연결됨" : `+ ${node.name}의 관계 추가`}
        </button>
      ) : (
        <div className="rounded-lg border border-line2 bg-canvas p-2.5">
          <div className="mb-1.5 pw-field-label">상대 인물 선택</div>
          <div className="flex flex-col gap-1.5">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => { onCreateEdge(c.id); setAdding(false); }}
                className="flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-2 text-left text-[13px] font-bold text-ink transition hover:border-brand hover:bg-wash"
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: ROLE_META[c.role].cap }} />
                {c.name}
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(false)} className="mt-2 w-full text-center text-[12px] font-bold text-muted transition hover:text-ink">취소</button>
        </div>
      )}
    </>
  );
}

/* ── 관계선 선택: 상세 편집 ────────────────────────────────────────────── */
function EdgeEditor({
  edge, nodes, onUpdate, onRemove, onAddTimeline, onUpdateTimeline, onRemoveTimeline, onBack,
}: {
  edge: Edge;
  nodes: Node[];
  onUpdate: (patch: Partial<Edge>) => void;
  onRemove: () => void;
  onAddTimeline: () => void;
  onUpdateTimeline: (tId: number, patch: Partial<TimelineItem>) => void;
  onRemoveTimeline: (tId: number) => void;
  onBack: () => void;
}) {
  const tl = [...edge.timeline].sort((a, b) => (a.ep || 0) - (b.ep || 0));
  const from = nodes.find((n) => n.id === edge.from);
  const to = nodes.find((n) => n.id === edge.to);
  return (
    <>
      <button onClick={onBack} className="pw-link mb-2 text-xs">‹ 전체 보기</button>
      <div className="mb-[18px] text-base font-bold text-ink">관계 편집</div>

      {/* 양쪽 인물 + 스왑 */}
      <div className="mb-[18px] flex items-center justify-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-3">
        {from && <NodeChip node={from} />}
        <button
          onClick={() => onUpdate({ from: edge.to, to: edge.from })}
          title="From / To 바꾸기"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line2 bg-white text-[13px] text-brand transition hover:bg-wash"
        >
          {edge.direction === "both" ? "⇄" : "→"}
        </button>
        {to && <NodeChip node={to} />}
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
        {edge.direction === "one" && (
          <div className="mt-2 text-[12px] text-muted">{from?.name} → {to?.name} 방향이에요. ⇄ 버튼으로 뒤집을 수 있어요.</div>
        )}
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
