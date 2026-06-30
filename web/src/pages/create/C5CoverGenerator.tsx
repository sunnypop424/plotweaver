import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HybridSelect } from "@/components/HybridSelect";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { generateCover, getNovel, updateCoverUrl, updateNovel, type NovelSettings } from "@/lib/api";

type Status = "idle" | "loading" | "done" | "error";
type Hybrid = { value: string; custom: boolean; text: string };

const STYLE_OPTIONS = ["웹툰풍", "유화풍", "미니멀 타이포", "실사풍", "수묵화", "사이버펑크"];
const TONE_OPTIONS = ["어두운", "밝은", "파스텔"];

export default function C5CoverGenerator() {
  const { isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: novelId } = useParams<{ id: string }>();

  const [novelData, setNovelData] = useState<{ title: string; settings: NovelSettings } | null>(null);
  const [style, setStyle] = useState<Hybrid>({ value: "웹툰풍", custom: false, text: "" });
  const [tone, setTone] = useState<Hybrid>({ value: "어두운", custom: false, text: "" });
  const [includeChar, setIncludeChar] = useState(true);
  // 함께 등장시킬 인물 이름 배열 (빈 배열 = 주인공 단독, null = 자동선택)
  const [featuredCharNames, setFeaturedCharNames] = useState<string[] | null>(null);
  const [includeTitle, setIncludeTitle] = useState(false);
  const [includeAuthor, setIncludeAuthor] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!novelId || novelId === "null") return;
    getNovel(novelId)
      .then((novel) => {
        setNovelData({ title: novel.title, settings: novel.settings });
        const saved = novel.settings?.coverStyle;
        if (saved && STYLE_OPTIONS.includes(saved)) {
          setStyle({ value: saved, custom: false, text: "" });
        } else if (saved) {
          setStyle({ value: "", custom: true, text: saved });
        }
        // 기존 표지가 있으면 첫 번째로 표시
        if (novel.cover_url) {
          setCoverUrls([novel.cover_url]);
          setSelectedIdx(0);
          setStatus("done");
        }
      })
      .catch(() => {});
  }, [novelId]);

  const effectiveStyle = style.custom ? style.text : style.value;
  const effectiveTone = tone.custom ? tone.text : tone.value;

  const run = async () => {
    if (status === "loading" || !novelId) return;
    setStatus("loading");
    setCoverUrls([]);
    setSelectedIdx(0);
    setConfirmed(false);
    try {
      const styleChanged = novelData && effectiveStyle !== novelData.settings?.coverStyle;
      const toneChanged = novelData && effectiveTone !== novelData.settings?.coverTone;
      if (styleChanged || toneChanged) {
        await updateNovel(novelId, {
          settings: { ...novelData!.settings, coverStyle: effectiveStyle, coverTone: effectiveTone },
        });
        setNovelData((d) => d ? { ...d, settings: { ...d.settings, coverStyle: effectiveStyle, coverTone: effectiveTone } } : d);
      }
      const res = await generateCover(novelId, {
        includeTitle,
        includeAuthor,
        includeChar,
        featuredCharNames: includeChar && featuredCharNames !== null ? featuredCharNames : undefined,
        authorName: includeAuthor ? authorName : undefined,
      });
      setCoverUrls(res.cover_urls?.length ? res.cover_urls : [res.cover_url]);
      setSelectedIdx(0);
      setStatus("done");
      showToast(`표지 ${res.cover_urls?.length ?? 1}장을 생성했어요`);
    } catch (e) {
      setStatus("error");
      showToast(e instanceof Error ? e.message : "표지 생성 실패");
    }
  };

  const handleConfirm = async () => {
    if (!novelId || confirming || coverUrls.length === 0) return;
    setConfirming(true);
    try {
      await updateCoverUrl(novelId, coverUrls[selectedIdx]);
      setConfirmed(true);
      showToast("표지가 확정됐어요");
    } catch {
      showToast("저장에 실패했어요");
    } finally {
      setConfirming(false);
    }
  };

  const onShare = () => {
    const shareUrl = `${window.location.origin}/market/${novelId}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => showToast("공유 링크를 복사했어요"),
      () => showToast("링크: " + shareUrl),
    );
  };

  const generating = status === "loading";
  const hasResult = status === "done" && coverUrls.length > 0;
  const showError = status === "error";
  const novelTitle = novelData?.title ?? "";

  return (
    <div className="min-h-screen bg-canvas">
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white px-[18px]">
        <button onClick={() => navigate(`/works/${novelId}/edit`)} className="pw-btn-ghost h-[38px] flex-shrink-0 px-2.5 text-sm">← 에디터</button>
        <div className="truncate text-base font-bold text-ink">
          표지 만들기{novelTitle ? ` · 「${novelTitle}」` : ""}
        </div>
      </div>

      {/* MAIN */}
      <div
        className="mx-auto box-border w-full"
        style={isDesktop ? { display: "flex", gap: 28, alignItems: "flex-start", maxWidth: 1160, padding: "28px 24px 100px" } : { display: "flex", flexDirection: "column", gap: 22, maxWidth: 680, padding: "22px 16px 110px" }}
      >
        {/* OPTIONS */}
        <div className={isDesktop ? "sticky top-[84px] w-[340px] flex-shrink-0" : "w-full"}>
          <div className="rounded-xl border border-hairline bg-white p-[22px]">
            <div className="mb-1 text-lg font-bold text-ink">표지 옵션</div>
            <div className="mb-5 text-[13px] text-muted">설정을 고르고 표지를 생성해 보세요.</div>

            <div className="mb-[18px]">
              <HybridSelect
                label="스타일"
                custom={style.custom}
                onToggleCustom={() => setStyle((s) => ({ ...s, custom: !s.custom }))}
                value={style.custom ? style.text : style.value}
                onChange={(v) => setStyle((s) => (s.custom ? { ...s, text: v } : { ...s, value: v }))}
                customPlaceholder="예: 빈티지 포스터"
                height={48}
              >
                {STYLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </HybridSelect>
            </div>

            <div className="mb-[18px]">
              <HybridSelect
                label="색감"
                custom={tone.custom}
                onToggleCustom={() => setTone((s) => ({ ...s, custom: !s.custom }))}
                value={tone.custom ? tone.text : tone.value}
                onChange={(v) => setTone((s) => (s.custom ? { ...s, text: v } : { ...s, value: v }))}
                customPlaceholder="예: 노을빛"
                height={48}
              >
                {TONE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </HybridSelect>
            </div>

            <div className="mb-[22px] flex flex-col gap-3">
              {/* 인물 포함 토글 + 인물 선택 */}
              <div>
                <button onClick={() => { setIncludeChar((v) => !v); if (includeChar) setFeaturedCharNames(null); }} className="inline-flex items-center gap-2.5 py-0.5 text-sm font-bold text-ink">
                  <span className={"flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[13px] leading-none text-white transition-all " + (includeChar ? "border border-brand bg-brand" : "border border-line2 bg-white")}>
                    {includeChar ? "✓" : ""}
                  </span>
                  인물 포함
                </button>
                {includeChar && (() => {
                  const nonProts = (novelData?.settings?.characters ?? []).filter(c => c.role !== "protagonist");
                  if (nonProts.length === 0) return null;
                  const ROLE_LABEL: Record<string, string> = { villain: "빌런", supporting: "조연" };
                  const toggleChar = (name: string) => {
                    setFeaturedCharNames(prev => {
                      const list = prev ?? [];
                      return list.includes(name) ? list.filter(n => n !== name) : [...list, name];
                    });
                  };
                  const isAuto = featuredCharNames === null;
                  const selected = featuredCharNames ?? [];
                  return (
                    <div className="mt-2.5 flex flex-col gap-1.5 pl-[30px]" style={{ animation: "pw-fade .15s ease" }}>
                      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">함께 등장시킬 인물 (복수 선택 가능)</div>
                      {/* 자동 선택 옵션 */}
                      <button
                        onClick={() => setFeaturedCharNames(null)}
                        className={"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold transition " + (isAuto ? "border-brand bg-wash text-brand" : "border-hairline bg-white text-ink2 hover:border-line2")}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[9px] font-bold" style={{ borderColor: isAuto ? "#816bff" : "#e5e5e5", background: isAuto ? "#816bff" : "white", color: "white" }}>
                          {isAuto ? "✓" : ""}
                        </span>
                        자동 선택
                        <span className="ml-auto text-[10px] font-normal text-muted">관계도 기반</span>
                      </button>
                      {nonProts.map(c => {
                        const on = selected.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            onClick={() => toggleChar(c.name)}
                            className={"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold transition " + (on ? "border-brand bg-wash text-brand" : "border-hairline bg-white text-ink2 hover:border-line2")}
                          >
                            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[9px] font-bold" style={{ borderColor: on ? "#816bff" : "#e5e5e5", background: on ? "#816bff" : "white", color: "white" }}>
                              {on ? "✓" : ""}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
                            {c.role && <span className="rounded-full bg-[#f2f2f2] px-1.5 py-0.5 text-[10px] font-bold text-muted">{ROLE_LABEL[c.role] ?? c.role}</span>}
                          </button>
                        );
                      })}
                      {/* 주인공 단독 */}
                      <button
                        onClick={() => setFeaturedCharNames([])}
                        className={"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold transition " + (!isAuto && selected.length === 0 ? "border-brand bg-wash text-brand" : "border-hairline bg-white text-ink2 hover:border-line2")}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[9px] font-bold" style={{ borderColor: (!isAuto && selected.length === 0) ? "#816bff" : "#e5e5e5", background: (!isAuto && selected.length === 0) ? "#816bff" : "white", color: "white" }}>
                          {(!isAuto && selected.length === 0) ? "✓" : ""}
                        </span>
                        주인공 단독
                      </button>
                    </div>
                  );
                })()}
              </div>
              <button onClick={() => setIncludeTitle((v) => !v)} className="inline-flex items-center gap-2.5 py-0.5 text-sm font-bold text-ink">
                <span className={"flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[13px] leading-none text-white transition-all " + (includeTitle ? "border border-brand bg-brand" : "border border-line2 bg-white")}>
                  {includeTitle ? "✓" : ""}
                </span>
                제목 타이포 포함
              </button>
              <div>
                <button onClick={() => setIncludeAuthor((v) => !v)} className="inline-flex items-center gap-2.5 py-0.5 text-sm font-bold text-ink">
                  <span className={"flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[13px] leading-none text-white transition-all " + (includeAuthor ? "border border-brand bg-brand" : "border border-line2 bg-white")}>
                    {includeAuthor ? "✓" : ""}
                  </span>
                  작가명 포함
                </button>
                {includeAuthor && (
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="필명 또는 본명"
                    className="mt-2 h-10 w-full rounded border border-hairline px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:shadow-focus"
                    style={{ animation: "pw-fade .15s ease" }}
                  />
                )}
              </div>
            </div>

            {/* generate buttons */}
            <div className="flex gap-2">
              {generating ? (
                <button disabled className="pw-btn-disabled h-[52px] flex-1 text-base" style={{ cursor: "default" }}>
                  <span className="mr-2 inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-muted/40 border-t-muted" />
                  생성 중...
                </button>
              ) : (
                <button onClick={run} className="pw-btn-primary h-[52px] flex-1 text-base">✦ 표지 생성</button>
              )}
            </div>

            {generating && (
              <div className="mt-3.5 text-center text-[13px] text-muted">gpt-image-2로 생성 중이에요. 20~40초 소요돼요.</div>
            )}
          </div>
        </div>

        {/* RESULT */}
        <div className={isDesktop ? "min-w-0 flex-1" : "w-full"}>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-lg font-bold text-ink">표지 미리보기</div>
            {hasResult && !generating && (
              <button onClick={run} className="pw-btn-slight h-9 px-3.5 text-sm">↻ 다시 생성</button>
            )}
          </div>

          {generating ? (
            /* 생성 중: 4개 스켈레톤 그리드 */
            <div>
              <div className="mb-2.5 text-center text-[13px] text-muted">gpt-image-2가 4가지 표지를 만들고 있어요. 30~60초 소요돼요.</div>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="pw-skel rounded-xl" style={{ aspectRatio: "6/9", height: "auto", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : showError ? (
            <div className="rounded-xl border border-dashed border-[#f3c9c8] bg-[#fdf4f4] px-6 py-10 text-center" style={{ animation: "pw-fade .3s ease" }}>
              <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[26px] font-bold text-error">!</div>
              <div className="text-base font-bold text-ink">표지 생성에 실패했어요</div>
              <div className="mt-2.5 inline-block rounded-full bg-wash px-3 py-1.5 text-sm font-bold text-brand">크레딧은 차감되지 않았어요</div>
              <div className="mt-[18px]">
                <button onClick={run} className="pw-btn-slight h-[46px] px-5 text-[15px]">↻ 다시 시도</button>
              </div>
            </div>
          ) : hasResult ? (
            /* 4개 선택 그리드 */
            <div style={{ animation: "pw-fade .3s ease" }}>
              <div className="mb-3 text-[13px] text-muted">마음에 드는 표지를 선택하고 확정하세요.</div>
              <div className="grid grid-cols-2 gap-3">
                {coverUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedIdx(i); setConfirmed(false); }}
                    className="relative overflow-hidden rounded-xl transition-all"
                    style={{
                      outline: selectedIdx === i ? "3px solid #816bff" : "3px solid transparent",
                      outlineOffset: "2px",
                      boxShadow: selectedIdx === i ? "0 0 0 1px #816bff22" : "0 2px 12px rgba(0,0,0,0.12)",
                    }}
                  >
                    <img src={url} alt={`표지 ${i + 1}`} className="block w-full object-cover" style={{ aspectRatio: "6/9" }} />
                    <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-[3px] text-[10px] font-bold text-white backdrop-blur-[2px]">#{i + 1}</div>
                    {selectedIdx === i && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white shadow-md" style={{ animation: "pw-fade .15s ease" }}>✓</div>
                    )}
                  </button>
                ))}
              </div>
              {confirmed && (
                <div className="mt-3 text-center text-sm font-bold text-[#2f8f5b]" style={{ animation: "pw-fade .2s ease" }}>✓ #{selectedIdx + 1}번 표지가 저장됐어요</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex aspect-[6/9] flex-col items-center justify-center rounded-xl border-2 border-dashed border-hairline bg-[#f8f8fb]">
                  <div className="text-[28px] font-bold text-muted/20">✦</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 바 — 위저드 스타일로 통일 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex items-center gap-2.5" style={{ maxWidth: 1160 }}>
          <button
            onClick={() => navigate(`/works/${novelId}/edit`)}
            className="h-[54px] flex-shrink-0 rounded border border-line2 bg-white px-[18px] text-[15px] font-bold text-ink2 transition hover:border-wash-2 hover:bg-wash hover:text-brand"
          >
            ← 에디터
          </button>
          <div className="flex flex-1 justify-end gap-2.5">
            {confirmed ? (
              <>
                <button onClick={() => setConfirmed(false)} className="pw-btn-slight h-[54px] px-[18px] text-[15px]">표지 변경</button>
                <button onClick={onShare} className="pw-btn-primary h-[54px] px-7 text-[17px] shadow-cta">↗ 공유하기</button>
              </>
            ) : (
              <button
                disabled={!hasResult || confirming}
                onClick={handleConfirm}
                className={(hasResult ? "pw-btn-primary shadow-cta" : "pw-btn-disabled") + " h-[54px] px-7 text-[17px]"}
              >
                {confirming ? "저장 중..." : "이 표지로 확정 →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
