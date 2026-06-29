import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

type DragState = { id: number; dx: number; dy: number; startX: number; startY: number };

/**
 * 캔버스 노드 드래그 + 탭/드래그 구분(4px) + ESC 해제 공통 훅.
 * C0 월드맵·C2 관계도가 공유한다. 노드/엣지의 시각 표현은 각 화면이 담당.
 *  - halfW/halfH: 캔버스 경계 클램프용 노드 반폭/반높이
 *  - onDrag(id, x, y): 드래그 중 노드 중심 좌표 갱신
 *  - onEscape: ESC 키로 선택 해제
 */
export function useCanvasDrag(opts: {
  canvasRef: RefObject<HTMLDivElement | null>;
  halfW: number;
  halfH: number;
  onDrag: (id: number, x: number, y: number) => void;
  onEscape?: () => void;
}) {
  const drag = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const cb = useRef(opts);
  cb.current = opts;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const canvas = cb.current.canvasRef.current;
      if (!d || !canvas) return;
      if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) movedRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const { halfW, halfH, onDrag } = cb.current;
      const x = Math.max(halfW, Math.min(rect.width - halfW, e.clientX - rect.left - d.dx));
      const y = Math.max(halfH, Math.min(rect.height - halfH, e.clientY - rect.top - d.dy));
      onDrag(d.id, x, y);
    };
    const onUp = () => { drag.current = null; };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cb.current.onEscape?.(); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /** 노드 onPointerDown에서 호출 — (x,y)는 노드 중심 좌표 */
  const startDrag = (e: ReactPointerEvent, id: number, x: number, y: number) => {
    const canvas = cb.current.canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    movedRef.current = false;
    drag.current = { id, dx: e.clientX - rect.left - x, dy: e.clientY - rect.top - y, startX: e.clientX, startY: e.clientY };
  };

  return { movedRef, startDrag };
}
