import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryCard, type WorkStatus } from "@/components/LibraryCard";
import { GlobalNav } from "@/components/GlobalNav";
import { listNovels, deleteNovel } from "@/lib/api";

type Novel = { id: string; title: string; status: string; created_at: string; cover_url: string | null; done_chapters: number; total_chapters: number };

const FILTERS: { key: WorkStatus | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "private", label: "비공개" },
  { key: "public", label: "공개" },
  { key: "selling", label: "판매중" },
];

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function DLibrary() {
  const navigate = useNavigate();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WorkStatus | "all">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listNovels()
      .then(setNovels)
      .catch(() => setNovels([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: novels.length,
    private: novels.filter((n) => n.status === "draft" || n.status === "private").length,
    public: novels.filter((n) => n.status === "public").length,
    selling: novels.filter((n) => n.status === "selling").length,
  };

  const filtered = novels.filter((n) => {
    if (filter === "all") return true;
    if (filter === "private") return n.status === "draft" || n.status === "private";
    return n.status === filter;
  });

  const confirmTitle = confirmDeleteId ? (novels.find((n) => n.id === confirmDeleteId)?.title ?? "") : "";

  const handleDelete = async () => {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    try {
      await deleteNovel(confirmDeleteId);
      setNovels((prev) => prev.filter((n) => n.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch {
      // 삭제 실패 시 다이얼로그만 닫기
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && novels.length === 0;
  const showNoResult = !loading && novels.length > 0 && filtered.length === 0;
  const showGrid = !loading && filtered.length > 0;

  return (
    <div className="min-h-screen bg-canvas">
      <GlobalNav active="library" />

      <div className="mx-auto px-6 pb-20 pt-8" style={{ maxWidth: 1180 }}>
        {/* HEADER */}
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[28px] font-bold tracking-[-0.5px] text-ink">내 작업실</div>
            <div className="mt-[5px] text-sm text-muted">
              {isEmpty ? "아직 작품이 없어요" : `${counts.all}개의 작품 · ${counts.selling}개 판매중`}
            </div>
          </div>
          <button
            onClick={() => navigate("/create/world")}
            className="inline-flex h-12 items-center gap-2 rounded border-none bg-brand px-5 text-[15px] font-bold text-white transition hover:bg-brand-hover"
            style={{ boxShadow: "0 4px 14px rgba(129,107,255,0.32)" }}
          >
            + 새 작품
          </button>
        </div>

        {/* FILTER TABS */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={"inline-flex h-10 items-center gap-[7px] rounded-full border px-4 text-sm font-bold transition " + (active ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}
              >
                {f.label}
                <span className={"rounded-full px-[7px] py-px text-xs font-bold " + (active ? "bg-white/[0.22] text-white" : "bg-wash text-brand")}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-white">
                <div className="pw-skel aspect-[16/9]" style={{ height: "auto", borderRadius: 0 }} />
                <div className="p-4">
                  <div className="mb-3.5 h-2 rounded-full bg-hairline" />
                  <div className="flex gap-[7px]">
                    <div className="h-[38px] flex-1 rounded bg-[#f0f0f0]" />
                    <div className="h-[38px] flex-1 rounded bg-[#f0f0f0]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-wash-2 bg-white px-6 py-[72px] text-center" style={{ animation: "pw-fade .3s ease" }}>
            <div className="mx-auto mb-[22px] flex h-[88px] w-[88px] items-center justify-center rounded-[20px] bg-wash">
              <div className="h-[58px] w-[46px] rounded" style={{ background: "linear-gradient(135deg,#816bff,#a892ff)", boxShadow: "0 6px 16px rgba(129,107,255,0.4)", transform: "rotate(-6deg)" }} />
            </div>
            <div className="text-xl font-bold text-ink">첫 작품을 만들어보세요</div>
            <div className="mx-auto mt-2 max-w-[360px] text-sm leading-[1.6] text-muted">설정만 넣으면 AI가 1회차를 써줘요.<br />완성한 작품은 여기 작업실에 차곡차곡 쌓여요.</div>
            <button onClick={() => navigate("/create/world")} className="mt-[26px] h-[52px] rounded border-none bg-brand px-[26px] text-base font-bold text-white transition hover:bg-brand-hover" style={{ boxShadow: "0 6px 18px rgba(129,107,255,0.35)" }}>+ 새 작품 만들기</button>
          </div>
        ) : showNoResult ? (
          <div className="rounded-xl border border-hairline bg-white px-6 py-14 text-center" style={{ animation: "pw-fade .3s ease" }}>
            <div className="text-base font-bold text-ink2">이 상태의 작품이 없어요</div>
            <div className="mt-1.5 text-sm text-muted">다른 필터를 선택해 보세요.</div>
            <button onClick={() => setFilter("all")} className="pw-btn-slight mt-[18px] h-[42px] px-[18px] text-sm">전체 보기</button>
          </div>
        ) : showGrid ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", animation: "pw-fade .3s ease" }}>
            {filtered.map((n, i) => (
              <LibraryCard
                key={n.id}
                title={n.title}
                genre={n.status === "draft" ? "비공개" : n.status}
                updated={relativeDate(n.created_at)}
                done={n.done_chapters}
                total={n.total_chapters}
                status={(n.status === "draft" ? "private" : n.status) as WorkStatus}
                variant={i % 6}
                src={n.cover_url ?? undefined}
                onOpen={() => navigate(`/works/${n.id}/edit`, { state: { title: n.title } })}
                onWrite={() => navigate(`/works/${n.id}/edit`, { state: { title: n.title } })}
                onCover={() => navigate(`/works/${n.id}/cover`)}
                onSell={() => navigate("/seller/register", { state: { novelId: n.id, title: n.title } })}
                onDelete={() => setConfirmDeleteId(n.id)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            style={{ animation: "pw-fade .15s ease" }}
            onClick={() => !deleting && setConfirmDeleteId(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[min(360px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
            style={{ animation: "pw-fade .15s ease" }}
          >
            <div className="mb-1 text-[17px] font-bold text-ink">작품 삭제</div>
            <div className="mb-5 text-[13px] leading-[1.6] text-muted">
              「{confirmTitle}」을 삭제할까요?<br />삭제하면 모든 회차와 설정이 사라지고 되돌릴 수 없어요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="h-11 flex-1 rounded border border-line2 bg-white text-sm font-bold text-ink2 transition hover:bg-canvas"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 flex-1 rounded border-none bg-error text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
