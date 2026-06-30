import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CoverTile } from "@/components/CoverTile";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { getNovel, listChapters, deleteNovel, type NovelSettings } from "@/lib/api";
import { useWizard } from "@/providers/WizardProvider";

const STATUS_META = {
  draft: { label: "비공개", cls: "bg-[#f2f2f2] text-ink2" },
  private: { label: "비공개", cls: "bg-[#f2f2f2] text-ink2" },
  public: { label: "무료 공개", cls: "bg-[#e8f5ee] text-[#2f8f5b]" },
  selling: { label: "판매중", cls: "bg-wash text-brand" },
} as const;
type NStatus = keyof typeof STATUS_META;

export default function DWorkDetail() {
  const { vw } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: novelId } = useParams<{ id: string }>();
  const { loadFromNovel } = useWizard();
  const isWide = vw >= 768;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<NStatus>("draft");
  const [settings, setSettings] = useState<NovelSettings | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [chapters, setChapters] = useState<{ seq: number; content: string; created_at: string }[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "work">(null);
  const [deleting, setDeleting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 편집 완료 후 돌아왔을 때 toast 표시
  useEffect(() => {
    const s = location.state as { toast?: string } | null;
    if (s?.toast) showToast(s.toast);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditSettings = () => {
    if (!settings || !novelId) return;
    loadFromNovel(novelId, settings);
    navigate("/create/world");
  };

  useEffect(() => {
    if (!novelId) return;
    Promise.all([getNovel(novelId), listChapters(novelId)])
      .then(([n, chs]) => {
        setTitle(n.title);
        setStatus((n.status as NStatus) ?? "draft");
        setSettings(n.settings);
        setCoverUrl(n.cover_url);
        setChapters(chs.sort((a, b) => a.seq - b.seq));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [novelId]);

  const st = STATUS_META[status] ?? STATUS_META.draft;
  const isSelling = status === "selling";
  const isPrivate = status === "draft" || status === "private";
  const total = settings?.totalChapters ?? 0;
  const done = chapters.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const settingChips = [
    settings?.era ? { label: "시대", value: settings.era } : null,
    settings?.characters?.length
      ? { label: "인물", value: settings.characters.length === 1 ? settings.characters[0].name : `${settings.characters[0].name} 외 ${settings.characters.length - 1}명` }
      : null,
    settings?.goal ? { label: "목표", value: settings.goal.slice(0, 16) } : null,
    settings?.ending ? { label: "결말", value: settings.ending.slice(0, 16) } : null,
  ].filter((c): c is { label: string; value: string } => c !== null);

  const more = (label: string) => () => { setMoreOpen(false); showToast(label); };

  const handleDeleteWork = async () => {
    if (!novelId || deleting) return;
    setDeleting(true);
    try {
      await deleteNovel(novelId);
      navigate("/library");
    } catch {
      showToast("삭제에 실패했어요");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        {/* 상단 바 스켈레톤 */}
        <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-hairline bg-white px-5">
          <div className="pw-skel h-4 w-16 rounded" />
          <div className="pw-skel h-4 w-36 rounded" />
          <div className="flex gap-2">
            <div className="pw-skel h-9 w-20 rounded" />
            <div className="pw-skel h-9 w-20 rounded" />
          </div>
        </div>
        <div className="mx-auto px-6 pb-20 pt-7" style={{ maxWidth: 1080 }}>
          {/* 작품 헤더 카드 스켈레톤 */}
          <div className="mb-4 rounded-xl border border-hairline bg-white p-6">
            <div className={isWide ? "flex gap-6" : "flex flex-col gap-5"}>
              <div className="pw-skel rounded-lg" style={{ width: isWide ? 180 : 150, aspectRatio: "2/3", height: "auto", flexShrink: 0 }} />
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex gap-2">
                  <div className="pw-skel h-6 w-14 rounded-full" />
                  <div className="pw-skel h-6 w-14 rounded-full" />
                </div>
                <div className="pw-skel h-7 w-3/4 rounded" />
                <div className="pw-skel h-4 w-1/3 rounded" />
                <div className="mt-2 flex gap-2">
                  <div className="pw-skel h-9 w-24 rounded-lg" />
                  <div className="pw-skel h-9 w-24 rounded-lg" />
                </div>
                <div className="mt-3 pw-skel h-2.5 w-full rounded-full" />
              </div>
            </div>
          </div>
          {/* 회차 목록 스켈레톤 */}
          <div className="rounded-xl border border-hairline bg-white">
            <div className="border-b border-hairline px-6 py-4">
              <div className="pw-skel h-5 w-24 rounded" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-hairline px-6 py-4 last:border-b-0">
                <div className="pw-skel h-4 w-8 rounded" />
                <div className="pw-skel h-4 flex-1 rounded" />
                <div className="pw-skel h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-hairline bg-white px-5">
        <button onClick={() => navigate("/library")} className="pw-btn-ghost h-[38px] flex-shrink-0 px-3 text-sm">← 작업실</button>
        <div className="min-w-0 truncate text-base font-bold">{title}</div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {isWide && (
            <>
              <button onClick={() => navigate(`/works/${novelId}/cover`)} className="h-10 rounded border border-line2 bg-white px-3.5 text-[13px] font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand">표지 만들기</button>
              <button onClick={() => navigate("/seller/register", { state: { novelId, title } })} className="h-10 rounded border-none bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-brand-hover">판매 등록</button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setMoreOpen((o) => !o)} className="h-10 w-10 rounded border-none bg-transparent text-lg text-muted transition hover:bg-canvas hover:text-ink2">⋯</button>
            {moreOpen && (
              <div className="absolute right-0 top-[46px] z-40 w-[184px] rounded-lg border border-hairline bg-white p-1.5 shadow-pop" style={{ animation: "pw-pop .15s ease" }}>
                <button onClick={more("작품을 복제했어요")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">복제</button>
                <button onClick={more("TXT로 내보내는 중...")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">TXT로 내보내기</button>
                <button onClick={more("PDF로 내보내는 중...")} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-ink transition hover:bg-canvas">PDF로 내보내기</button>
                <div className="mx-1 my-1.5 h-px bg-hairline" />
                <button onClick={() => { setMoreOpen(false); setConfirm("work"); }} className="block w-full rounded px-3 py-2.5 text-left text-sm font-bold text-error transition hover:bg-error-wash">삭제</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 pb-20 pt-7" style={{ maxWidth: 1080 }}>
        {/* WORK HEADER */}
        <div className="mb-4 rounded-xl border border-hairline bg-white p-6">
          <div style={isWide ? { display: "flex", gap: 24, alignItems: "flex-start" } : { display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ width: isWide ? 180 : 150, flexShrink: 0 }}><CoverTile title={title} variant={0} src={coverUrl ?? undefined} /></div>
            <div className="min-w-0 flex-1">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className={"rounded-full px-[11px] py-1 text-[11px] font-bold " + st.cls}>{st.label}</span>
                <span className="rounded-full bg-[#f2f2f2] px-2.5 py-1 text-[11px] font-bold text-ink2">전체 이용가</span>
                <span className="rounded-full bg-wash px-2.5 py-1 text-[11px] font-bold text-brand">AI 보조</span>
              </div>
              <div className="text-[22px] font-bold leading-[1.3] tracking-[-0.5px]">{title}</div>
              <div className="mt-1.5 text-sm text-muted">{settings?.genres?.join(" · ") ?? ""}</div>

              {settingChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {settingChips.map((c) => (
                    <span key={c.label} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-[#fafafa] px-3 py-2 text-[13px] text-ink2">
                      <span className="text-[11px] font-bold text-muted">{c.label}</span>
                      <span className="font-bold text-ink">{c.value}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-[18px]">
                <div className="mb-[7px] flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink2">전체 진행률</span>
                  <span className="text-[13px] font-bold text-brand">{done} / {total}화 · {pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-wash">
                  <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRIVATE NOTICE */}
        {isPrivate && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-[18px] py-4">
            <span className="text-base">🔒</span>
            <span className="text-[13px] leading-[1.5] text-muted">비공개 작품이에요. 판매 등록하면 조회·구매·후원 통계를 볼 수 있어요.</span>
          </div>
        )}

        {/* SETTINGS PANEL */}
        {settings && (
          <div className="mb-4 rounded-xl border border-hairline bg-white">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-[22px] py-4"
            >
              <span className="text-base font-bold text-ink">작품 설정</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditSettings(); }}
                  className="h-8 rounded border border-line2 bg-white px-3 text-[13px] font-bold text-ink2 transition hover:border-brand hover:text-brand"
                >
                  설정 편집
                </button>
                <span className="text-sm text-muted">{settingsOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {settingsOpen && (
              <div className="border-t border-hairline px-[22px] pb-5 pt-4" style={{ animation: "pw-fill .2s ease" }}>
                {/* 기본 정보 */}
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {settings.era && <SettingCell label="시대">{settings.era}</SettingCell>}
                  {settings.genres?.length > 0 && <SettingCell label="장르">{settings.genres.join(" · ")}</SettingCell>}
                  {settings.tone && <SettingCell label="문체·톤">{settings.tone}</SettingCell>}
                  {settings.pov && <SettingCell label="시점">{settings.pov}</SettingCell>}
                  {settings.length && <SettingCell label="분량">{settings.length}</SettingCell>}
                  {settings.ageRating && <SettingCell label="연령등급">{settings.ageRating === "all" ? "전체이용가" : settings.ageRating === "15" ? "15세 이상" : "19세 이상"}</SettingCell>}
                </div>

                {/* 목표 / 갈등 */}
                {(settings.goal || settings.conflict) && (
                  <div className="mb-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">서사</div>
                    <div className="flex flex-col gap-2">
                      {settings.goal && (
                        <div className="rounded-lg bg-canvas px-3.5 py-2.5 text-[13px] text-ink">
                          <span className="mr-2 text-[11px] font-bold text-muted">목표</span>{settings.goal}
                        </div>
                      )}
                      {settings.conflict && (
                        <div className="rounded-lg bg-canvas px-3.5 py-2.5 text-[13px] text-ink">
                          <span className="mr-2 text-[11px] font-bold text-muted">갈등</span>{settings.conflict}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 서사 흐름 */}
                {settings.storyFlow && Object.values(settings.storyFlow).some(Boolean) && (
                  <div className="mb-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">서사 흐름</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["발단", "전개", "위기", "절정"] as const).map((k) => settings.storyFlow[k] ? (
                        <div key={k} className="rounded-lg bg-canvas px-3 py-2.5">
                          <div className="mb-1 text-[11px] font-bold text-brand">{k}</div>
                          <div className="text-[12px] leading-[1.5] text-ink">{settings.storyFlow[k]}</div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* 등장인물 */}
                {settings.characters?.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">등장인물 {settings.characters.length}명</div>
                    <div className="flex flex-col gap-1.5">
                      {settings.characters.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-hairline bg-white px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-ink">{c.name}</span>
                              <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (c.role === "protagonist" ? "bg-wash text-brand" : c.role === "villain" ? "bg-[#fdecec] text-error" : "bg-canvas text-ink2")}>
                                {c.role === "protagonist" ? "주인공" : c.role === "villain" ? "빌런" : "조연"}
                              </span>
                              {c.autoAdded && (
                                <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-[11px] font-bold text-[#d9822b]">자동추가</span>
                              )}
                              {c.faction && <span className="text-[12px] text-muted">{c.faction}</span>}
                              {c.rank && <span className="text-[12px] text-muted">· {c.rank}</span>}
                            </div>
                            {c.personality && <div className="mt-0.5 text-[12px] text-muted">{c.personality}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHAPTER LIST */}
        <div className="rounded-xl border border-hairline bg-white p-[22px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">회차 목록</span>
              <span className="text-[13px] font-bold text-muted">{done}화</span>
            </div>
            <button onClick={() => navigate(`/works/${novelId}/edit`)} className="inline-flex h-10 items-center gap-1.5 rounded border-none bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover">+ 다음 회차 생성</button>
          </div>

          {chapters.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[15px] font-bold text-ink2">아직 회차가 없어요</div>
              <div className="mt-1.5 text-[13px] text-muted">첫 회차를 생성하면 여기에 쌓여요.</div>
              <button onClick={() => navigate(`/works/${novelId}/edit`)} className="mt-[18px] h-[46px] rounded border-none bg-brand px-[22px] text-[15px] font-bold text-white">✦ 첫 회차 생성하기</button>
            </div>
          ) : (
            <div className="flex flex-col">
              {chapters.map((c) => {
                const wordCount = Math.round(c.content.replace(/\s+/g, "").length / 2);
                return (
                  <div key={c.seq} className="flex items-center gap-3.5 border-b border-[#f4f4f4] px-2 py-3.5 last:border-b-0">
                    <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-wash text-sm font-bold text-brand">{c.seq}</span>
                    <button onClick={() => navigate(`/works/${novelId}/edit`)} className="min-w-0 flex-1 border-none bg-transparent p-0 text-left">
                      <div className="truncate text-sm font-bold text-ink">{c.seq}화</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">{wordCount.toLocaleString("ko-KR")}자</span>
                        <span className="rounded-full bg-wash px-[9px] py-[3px] text-[11px] font-bold text-brand">AI 보조</span>
                        <span className="rounded-full bg-[#f2f2f2] px-[9px] py-[3px] text-[11px] font-bold text-muted">생성됨</span>
                      </div>
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <ActBtn wide onClick={() => navigate(`/read/${novelId}`, { state: { seq: c.seq } })}>읽기</ActBtn>
                      <ActBtn onClick={() => navigate(`/works/${novelId}/edit`)}>✎</ActBtn>
                      <ActBtn onClick={() => showToast(`${c.seq}화 재생성은 에디터에서 할 수 있어요`)}>↻</ActBtn>
                      <ActBtn danger onClick={() => showToast("회차 삭제는 준비 중이에요")}>✕</ActBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PUBLISH FOOTER */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hairline bg-white p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={"flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-base font-bold " + (isSelling ? "bg-[#e8f5ee] text-[#2f8f5b]" : "bg-wash text-brand")}>{isSelling ? "✓" : "₩"}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{isSelling ? "판매 중 · 기여 게이트 통과" : "아직 판매하지 않는 작품이에요"}</div>
              <div className="mt-0.5 text-[13px] leading-[1.5] text-muted">{isSelling ? '모든 회차가 "AI 보조" 이상이라 판매 조건을 충족해요.' : "판매하려면 회차별 창작 기여 점검을 거쳐요."}</div>
            </div>
          </div>
          <button onClick={() => navigate("/seller/register", { state: { novelId, title } })} className="pw-btn-slight h-11 flex-shrink-0 px-[18px] text-sm">{isSelling ? "판매 관리" : "판매 등록"}</button>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {confirm && (
        <div onClick={() => !deleting && setConfirm(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[360px] rounded-[14px] bg-white p-[26px]" style={{ animation: "pw-pop .22s ease" }}>
            <div className="text-[17px] font-bold text-ink">작품을 삭제할까요?</div>
            <div className="mt-2.5 text-sm leading-[1.6] text-ink2">작품과 모든 회차가 영구 삭제돼요. 되돌릴 수 없어요.</div>
            <div className="mt-[22px] flex gap-2.5">
              <button onClick={() => setConfirm(null)} disabled={deleting} className="h-12 flex-1 rounded border border-line2 bg-white text-[15px] font-bold text-ink2">취소</button>
              <button onClick={handleDeleteWork} disabled={deleting} className="h-12 flex-1 rounded border-none bg-error text-[15px] font-bold text-white disabled:opacity-60">{deleting ? "삭제 중..." : "삭제"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-canvas px-3.5 py-2.5">
      <div className="mb-0.5 text-[11px] font-bold text-muted">{label}</div>
      <div className="text-[13px] font-bold text-ink">{children}</div>
    </div>
  );
}

function ActBtn({ onClick, danger, wide, children }: { onClick: () => void; danger?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"flex h-[34px] flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-hairline bg-white text-[13px] font-bold transition hover:bg-canvas " + (wide ? "px-2.5" : "w-[34px]") + (danger ? " text-[#c4849f] hover:text-error" : " text-ink2 hover:text-brand")}>
      {children}
    </button>
  );
}
