import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";
import { generateChapter, getNovel, listChapters, updateChapter, reviewChapter, type ReviewResult, type ReviewIssue } from "@/lib/api";

type Chapter = { id: number; num: number; title: string; body: string };
type Mode = "read" | "edit";
type NavState = { title?: string; chapters?: { seq: number; content: string }[] } | null;

export default function C4EditorViewer() {
  const { isMobile, isDesktop } = useViewport();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: novelId } = useParams<{ id: string }>();
  const { data: wizData, reset, loadFromNovel } = useWizard();

  const navState = (location.state as NavState) ?? null;
  const chapterBody = wizData.chapterContent ?? "";

  // 제목: wizData > 네비게이션 state > API 로드
  const [localTitle, setLocalTitle] = useState(navState?.title ?? "");
  const novelTitle = wizData.title || localTitle || "...";

  // 회차: 네비게이션 state에 데이터가 있으면 즉시 렌더, 없으면 API 로드
  const initChapters = (): Chapter[] => {
    if (navState?.chapters?.length) {
      return [...navState.chapters]
        .sort((a, b) => a.seq - b.seq)
        .map((c) => ({
          id: c.seq, num: c.seq, title: `${c.seq}화`,
          body: c.seq === 1 && chapterBody ? chapterBody : c.content,
        }));
    }
    return [{ id: 1, num: 1, title: "1화", body: chapterBody || "" }];
  };
  const [chapters, setChapters] = useState<Chapter[]>(initChapters);
  const [chaptersReady, setChaptersReady] = useState(
    !!(navState?.chapters?.length || chapterBody)
  );

  const cid = useRef(
    navState?.chapters?.length
      ? Math.max(...navState.chapters.map((c) => c.seq))
      : 1
  );

  useEffect(() => {
    if (!novelId) return;
    const needTitle = !wizData.title && !navState?.title;
    const needChapters = !navState?.chapters?.length;

    if (needTitle) {
      getNovel(novelId).then((n) => setLocalTitle(n.title)).catch(() => {});
    }
    if (needChapters) {
      listChapters(novelId)
        .then((chs) => {
          if (chs.length === 0) { setChaptersReady(true); return; }
          const sorted = chs.sort((a, b) => a.seq - b.seq);
          setChapters(sorted.map((c) => ({
            id: c.seq, num: c.seq, title: `${c.seq}화`,
            body: c.seq === 1 && chapterBody ? chapterBody : c.content,
          })));
          cid.current = sorted[sorted.length - 1].seq;
        })
        .catch(() => {})
        .finally(() => setChaptersReady(true));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentId, setCurrentId] = useState(
    navState?.chapters?.length
      ? Math.max(...navState.chapters.map((c) => c.seq))
      : 1
  );
  const [mode, setMode] = useState<Mode>("read");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewRound, setReviewRound] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contribution, setContribution] = useState(18);
  const [authorNote, setAuthorNote] = useState("");

  const cur = chapters.find((c) => c.id === currentId) ?? chapters[0];

  const selectChapter = (id: number) => { setCurrentId(id); setMode("read"); setDrawerOpen(false); };

  const saveCurrentChapter = async () => {
    if (!novelId || saving) return;
    setSaving(true);
    try {
      await updateChapter(novelId, cur.num, cur.body);
      setSavedAt(Date.now());
    } catch {
      showToast("저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

  const switchMode = (m: Mode) => {
    if (mode === "edit" && m === "read") saveCurrentChapter();
    setMode(m);
  };
  const partialEdit = () => { setMode("edit"); showToast("편집 모드예요. 문장을 직접 다듬어 보세요"); };

  const onBodyChange = (val: string) => {
    setChapters((cs) => cs.map((c) => (c.id === currentId ? { ...c, body: val } : c)));
    setContribution((v) => Math.min(100, v + 2));
    setSavedAt(null);
  };

  // isReReview=true 이면 이슈 없을 때 자동 저장 후 모달 닫기
  const runReview = async (isReReview = false) => {
    if (reviewing || !novelId) return;
    setReviewing(true);
    try {
      const result = await reviewChapter(novelId, cur.num, cur.body);
      setReviewRound(r => r + 1);
      const critical = result.issues.filter(i => i.severity !== "info");
      if (isReReview && critical.length === 0) {
        await saveCurrentChapter();
        setReviewResult(null);
        setReviewRound(0);
        showToast("이슈가 없어 자동 저장됐어요");
      } else {
        setReviewResult(result);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "검토 실패");
    } finally {
      setReviewing(false);
    }
  };

  // 개별 이슈의 개선안을 원고에 반영하고 목록에서 제거
  const applyFix = (issue: ReviewIssue) => {
    if (!issue?.quote || !issue?.suggestion) return;
    const curBody = chapters.find(c => c.id === currentId)?.body ?? "";
    const newBody = curBody.replace(issue.quote, issue.suggestion);
    if (newBody === curBody) {
      showToast("원문 구절을 찾지 못했어요. 직접 수정해 주세요.");
      return;
    }
    setChapters(cs => cs.map(c => c.id === currentId ? { ...c, body: newBody } : c));
    setReviewResult(prev =>
      prev ? { ...prev, issues: prev.issues.filter(i => i !== issue) } : null
    );
  };

  const regenerate = async () => {
    if (regenerating || !novelId) { if (!novelId) showToast("작품 ID가 없어요. 다시 생성해주세요."); return; }
    setRegenerating(true); setMode("read");
    try {
      const res = await generateChapter(novelId, cur.num, authorNote);
      setChapters((cs) => cs.map((c) => (c.id === currentId ? { ...c, body: res.content } : c)));
      setSavedAt(Date.now());
      showToast("이 회차를 다시 생성했어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "재생성 실패");
    } finally {
      setRegenerating(false);
    }
  };
  const generateNext = async () => {
    if (generatingNext || !novelId) { if (!novelId) showToast("작품 ID가 없어요. 다시 생성해주세요."); return; }
    setGeneratingNext(true); setDrawerOpen(false);
    const nextNum = chapters.length + 1;
    try {
      const res = await generateChapter(novelId, nextNum, authorNote);
      const id = ++cid.current;
      setChapters((cs) => [...cs, { id, num: nextNum, title: `${nextNum}화`, body: res.content }]);
      setCurrentId(id); setMode("read");
      setSavedAt(Date.now());
      showToast("다음 회차를 생성했어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "회차 생성 실패");
    } finally {
      setGeneratingNext(false);
    }
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
            <button onClick={() => setDrawerOpen(true)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded text-xl text-ink hover:bg-wash">=</button>
          )}
          <button onClick={async () => { if (mode === "edit") await saveCurrentChapter(); reset(); navigate("/library"); }} className="pw-btn-ghost h-[38px] flex-shrink-0 px-2.5 text-sm">← 작업실</button>
          <div className="truncate text-base font-bold text-ink">{novelTitle}</div>
          {saving && <span className="hidden text-xs text-muted sm:block">저장 중...</span>}
          {savedAt && !saving && <span className="hidden text-xs font-bold text-[#2f8f5b] sm:block">✓ 저장됨</span>}
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={async () => {
              if (!novelId) return;
              try {
                const novel = await getNovel(novelId);
                loadFromNovel(novelId, novel.settings, `/works/${novelId}/edit`);
                navigate("/create/world");
              } catch {
                navigate(`/works/${novelId}`);
              }
            }}
            className="pw-btn-slight h-10 px-3.5 text-sm"
          >설정 편집</button>
          {!isMobile && (
            <>
              <button onClick={() => navigate(`/works/${novelId}/cover`)} className="pw-btn-slight h-10 px-3.5 text-sm">표지 만들기</button>
              <button onClick={() => navigate("/seller/register", { state: { novelId, title: novelTitle } })} className="pw-btn-primary h-10 px-4 text-sm">판매등록</button>
            </>
          )}
        </div>
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
              <div className="mt-2.5 text-xs leading-normal text-muted">판매하려면 직접 편집이 필요해요. 문장을 다듬을수록 게이지가 채워지고 AI 보조로 바뀌어요.</div>
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
            {regenerating || !chaptersReady ? (
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

            {/* 작가 추가 지시 — 재생성·다음 화 생성 시 함께 반영 */}
            <div className="mt-6 rounded-lg border border-hairline bg-canvas p-3.5">
              <div className="mb-1.5 text-[13px] font-bold text-ink">✦ 작가 추가 지시 <span className="font-normal text-muted">선택 · 재생성·다음 회차 생성에 반영돼요</span></div>
              <textarea
                value={authorNote}
                onChange={(e) => setAuthorNote(e.target.value)}
                rows={2}
                placeholder="예: 이번 화는 액션 비중을 늘려줘. 대사보다 전투 묘사에 집중해줘."
                className="w-full resize-none rounded-lg border border-hairline bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/50 focus:border-brand focus:shadow-focus"
              />
            </div>

            {/* actions */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
              <div className="flex flex-wrap gap-2">
                <button onClick={partialEdit} className="inline-flex h-11 items-center gap-1.5 rounded border border-line2 bg-white px-4 text-sm font-bold text-ink2 transition hover:border-brand hover:bg-canvas hover:text-brand">편집 모드</button>
                <button onClick={regenerate} className="inline-flex h-11 items-center gap-1.5 rounded border border-line2 bg-white px-4 text-sm font-bold text-ink2 transition hover:border-brand hover:bg-canvas hover:text-brand">재생성</button>
                <button onClick={() => runReview()} disabled={reviewing} className={"inline-flex h-11 items-center gap-1.5 rounded border px-4 text-sm font-bold transition " + (reviewing ? "border-brand/30 bg-wash text-brand/50 cursor-default" : "border-brand/40 bg-white text-brand hover:bg-wash")}>
                  {reviewing ? <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> 검토 중...</> : "✦ AI 검토 후 저장"}
                </button>
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

      {/* 다음 회차 생성 중 오버레이 */}
      {generatingNext && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" style={{ animation: "pw-fade .2s ease" }}>
          <div className="w-full max-w-[360px] rounded-2xl bg-white px-10 py-9 text-center shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
            <div className="mx-auto mb-5 h-10 w-10 rounded-full border-[3px] border-wash border-t-brand" style={{ animation: "pw-spin 1.4s ease-in-out infinite" }} />
            <div className="text-xl font-bold tracking-[-0.3px] text-ink">
              <span className="text-brand">✦</span> {chapters.length + 1}화를 집필 중이에요
            </div>
            <div className="mt-2.5 text-sm text-muted">AI가 다음 이야기를 이어갑니다.<br />20~40초 소요돼요.</div>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
              <div className="h-full w-2/5 rounded-full bg-brand" style={{ animation: "pw-progress 1.8s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
      )}

      {/* AI 검토 모달 */}
      {(reviewResult || reviewing) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" style={{ animation: "pw-fade .2s ease" }}>
          <div className="flex w-full max-w-[540px] flex-col rounded-t-2xl bg-white sm:max-h-[90vh] sm:rounded-2xl sm:shadow-xl" style={{ animation: "pw-sheet .25s ease" }}>

            {/* 헤더 */}
            <div className="flex-shrink-0 border-b border-hairline px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="text-[17px] font-bold text-ink">
                  AI 검토 결과
                  {reviewRound > 1 && <span className="ml-2 text-[13px] font-normal text-muted">{reviewRound}라운드</span>}
                </div>
                {reviewing ? (
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                    검토 중...
                  </span>
                ) : reviewResult ? (
                  <span className={"rounded-full px-3 py-1 text-[12px] font-bold " + (reviewResult.issues.filter(i => i.severity !== "info").length === 0 ? "bg-[#e8f5ee] text-[#2f8f5b]" : "bg-[#fff0f0] text-[#c0504e]")}>
                    {reviewResult.issues.filter(i => i.severity !== "info").length === 0 ? "✓ 이상 없음" : `⚠ ${reviewResult.issues.filter(i => i.severity !== "info").length}건 수정 권장`}
                  </span>
                ) : null}
              </div>
              {reviewResult && <div className="mt-1.5 text-[13px] text-muted">{reviewResult.summary}</div>}
            </div>

            {/* 이슈 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reviewing && !reviewResult && (
                <div className="flex flex-col gap-3 py-2">
                  {[85, 100, 70, 90].map((w, i) => (
                    <div key={i} className="pw-skel" style={{ width: `${w}%`, height: 20 }} />
                  ))}
                </div>
              )}

              {reviewResult && reviewResult.issues.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mb-1.5 text-4xl">✓</div>
                  <div className="text-[15px] font-bold text-[#2f8f5b]">검토 이슈가 없어요!</div>
                  <div className="mt-1 text-[13px] text-muted">저장을 진행해 주세요.</div>
                </div>
              )}

              {reviewResult && reviewResult.issues.length > 0 && (
                <div className="flex flex-col gap-3">
                  {reviewResult.issues.map((issue, i) => {
                    const sev = issue.severity;
                    const borderBg = sev === "error"
                      ? "border-[#f8d7d7] bg-[#fff8f8]"
                      : sev === "warning"
                      ? "border-[#fff3cd] bg-[#fffdf0]"
                      : "border-hairline bg-canvas";
                    const icon = sev === "error" ? "🔴" : sev === "warning" ? "🟡" : "🔵";
                    const canFix = !!(issue.quote && issue.suggestion);
                    return (
                      <div key={i} className={"rounded-xl border p-4 " + borderBg}>
                        <div className="mb-2 flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span className="text-[12px] font-bold text-ink2 uppercase tracking-wide">{issue.type}</span>
                        </div>
                        <div className="mb-3 text-[13px] leading-relaxed text-ink">{issue.text}</div>

                        {issue.quote && (
                          <div className="mb-2">
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">원문</div>
                            <div className="rounded-lg bg-[#f5f5f5] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#555]">
                              {issue.quote}
                            </div>
                          </div>
                        )}

                        {issue.suggestion && (
                          <div className="mb-3">
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#2f8f5b]">개선안</div>
                            <div className="rounded-lg border border-[#c3e8d0] bg-[#f0faf4] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#1f6b44]">
                              {issue.suggestion}
                            </div>
                          </div>
                        )}

                        {canFix && (
                          <button
                            onClick={() => applyFix(issue)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2f8f5b] px-4 text-[13px] font-bold text-white transition hover:bg-[#267a4f]"
                          >
                            개선하기 →
                          </button>
                        )}
                        {!canFix && sev !== "info" && (
                          <span className="text-[12px] font-bold text-muted">직접 수정이 필요해요</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 푸터 버튼 — 저장은 항상 활성 */}
            <div className="flex-shrink-0 border-t border-hairline px-6 py-4">
              <div className="flex gap-2.5">
                <button
                  onClick={() => { setReviewResult(null); setReviewRound(0); }}
                  className="h-11 flex-1 rounded border border-line2 bg-white text-sm font-bold text-ink2 transition hover:border-brand hover:text-brand"
                >
                  계속 편집
                </button>
                {!reviewing && reviewResult && reviewResult.issues.filter(i => i.severity !== "info").length > 0 && (
                  <button
                    onClick={() => runReview(true)}
                    className="h-11 flex-1 rounded border border-brand/40 bg-white text-sm font-bold text-brand transition hover:bg-wash"
                  >
                    재검토
                  </button>
                )}
                <button
                  disabled={saving}
                  onClick={async () => { await saveCurrentChapter(); setReviewResult(null); setReviewRound(0); showToast("저장됐어요"); }}
                  className="h-11 flex-[2] rounded bg-brand text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/50" style={{ animation: "pw-fade .2s ease" }} />
          <div className="fixed inset-y-0 left-0 z-[41] w-[280px] max-w-[84vw] overflow-y-auto bg-white p-[18px] shadow-[2px_0_16px_rgba(0,0,0,0.16)]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">회차 {chapters.length}</span>
              <button onClick={() => setDrawerOpen(false)} className="h-8 w-8 rounded text-lg text-muted">x</button>
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
