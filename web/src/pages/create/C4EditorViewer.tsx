import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { useViewport } from "@/lib/useViewport";
import { useWizard } from "@/providers/WizardProvider";
import { generateChapter, getNovel, listChapters, updateChapter, reviewChapter, reviewAllChapters, type ReviewResult, type ReviewIssue, type ChapterReviewResult } from "@/lib/api";

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

  // 회차 목록: 10화 단위로 묶어 접이식으로 표시
  const GROUP_SIZE = 10;
  const chapterGroups = useMemo(() => {
    const groups: Chapter[][] = [];
    for (let i = 0; i < chapters.length; i += GROUP_SIZE) groups.push(chapters.slice(i, i + GROUP_SIZE));
    return groups;
  }, [chapters]);
  const groupIndexOf = (id: number) => {
    const i = chapters.findIndex((c) => c.id === id);
    return i < 0 ? 0 : Math.floor(i / GROUP_SIZE);
  };
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => new Set([groupIndexOf(currentId)]));
  useEffect(() => {
    setOpenGroups((prev) => {
      const idx = groupIndexOf(currentId);
      if (prev.has(idx)) return prev;
      return new Set(prev).add(idx);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, chapters.length]);
  const toggleGroup = (idx: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const [mode, setMode] = useState<Mode>("read");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewMode, setReviewMode] = useState<"single" | "all" | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewAllResult, setReviewAllResult] = useState<ChapterReviewResult[] | null>(null);
  const [expandedSeqs, setExpandedSeqs] = useState<Set<number>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [reviewInstruction, setReviewInstruction] = useState("");
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
    setReviewMode("single"); setReviewAllResult(null); setReviewPanelOpen(false);
    setReviewing(true);
    try {
      const result = await reviewChapter(novelId, cur.num, cur.body, reviewInstruction.trim() || undefined);
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

  // 저장된 전체 회차를 한 번에 AI 검토 (시작 전 현재 회차 편집 내용 먼저 저장)
  const runReviewAll = async () => {
    if (reviewing || !novelId) return;
    setReviewMode("all"); setReviewResult(null); setReviewRound(0); setReviewPanelOpen(false);
    setReviewing(true); setReviewAllResult(null);
    try {
      if (mode === "edit" || savedAt === null) await saveCurrentChapter();
      const res = await reviewAllChapters(novelId, reviewInstruction.trim() || undefined);
      setReviewAllResult(res.results);
      setExpandedSeqs(new Set(res.results.filter(r => r.failed || r.issues.some(i => i.severity !== "info")).map(r => r.seq)));
      if (res.failedSeqs.length > 0) {
        showToast(`${res.failedSeqs.map(s => `${s}화`).join(", ")} 검토에 실패했어요. 재시도해 주세요.`);
      } else {
        showToast(res.totalCritical === 0 ? "모든 회차에 이슈가 없어요" : `${res.results.length}개 회차 중 ${res.totalCritical}건 수정 권장`);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "전체 검토 실패");
    } finally {
      setReviewing(false);
    }
  };

  const toggleExpand = (seq: number) => {
    setExpandedSeqs(prev => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq); else next.add(seq);
      return next;
    });
  };

  // 전체 검토 중 실패한 회차만 다시 검토
  const [retryingSeq, setRetryingSeq] = useState<number | null>(null);
  const retryChapterReview = async (seq: number) => {
    if (!novelId || retryingSeq !== null) return;
    const ch = chapters.find(c => c.num === seq);
    if (!ch) return;
    setRetryingSeq(seq);
    try {
      const result = await reviewChapter(novelId, seq, ch.body, reviewInstruction.trim() || undefined);
      setReviewAllResult(prev => prev ? prev.map(r => (r.seq === seq ? { seq, ...result, failed: false } : r)) : null);
      setExpandedSeqs(prev => new Set(prev).add(seq));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "재시도 실패");
    } finally {
      setRetryingSeq(null);
    }
  };

  // 개별 이슈의 개선안을 원고에 반영하고 목록에서 제거 (targetSeq 없으면 현재 회차)
  const applyFix = (issue: ReviewIssue, targetSeq?: number) => {
    if (!issue?.quote || !issue?.suggestion) return;
    const id = targetSeq ?? currentId;
    const target = chapters.find(c => c.id === id);
    if (!target) return;
    const newBody = target.body.replace(issue.quote, issue.suggestion);
    if (newBody === target.body) {
      showToast("원문 구절을 찾지 못했어요. 직접 수정해 주세요.");
      return;
    }
    setChapters(cs => cs.map(c => c.id === id ? { ...c, body: newBody } : c));
    if (reviewMode === "all") {
      setReviewAllResult(prev =>
        prev ? prev.map(r => r.seq === id ? { ...r, issues: r.issues.filter(i => i !== issue) } : r) : null
      );
    } else {
      setReviewResult(prev =>
        prev ? { ...prev, issues: prev.issues.filter(i => i !== issue) } : null
      );
    }
  };

  // 전체 검토에서 수정 반영한 회차들을 한 번에 저장
  const saveAllReviewed = async () => {
    if (!novelId || !reviewAllResult || savingAll) return;
    setSavingAll(true);
    try {
      await Promise.all(reviewAllResult.map(r => {
        const ch = chapters.find(c => c.id === r.seq);
        return ch ? updateChapter(novelId, ch.num, ch.body) : Promise.resolve({ ok: true });
      }));
      setSavedAt(Date.now());
      showToast("검토 반영 내용을 모두 저장했어요");
      setReviewAllResult(null);
      setReviewMode(null);
    } catch {
      showToast("일부 회차 저장에 실패했어요");
    } finally {
      setSavingAll(false);
    }
  };

  // 검토 이슈 카드 — 단일/전체 검토 모달이 공유
  const renderIssueCard = (issue: ReviewIssue, key: number, onApply: () => void) => {
    const sev = issue.severity;
    const borderBg = sev === "error" ? "border-[#f8d7d7] bg-[#fff8f8]" : sev === "warning" ? "border-[#fff3cd] bg-[#fffdf0]" : "border-hairline bg-canvas";
    const icon = sev === "error" ? "🔴" : sev === "warning" ? "🟡" : "🔵";
    const canFix = !!(issue.quote && issue.suggestion);
    return (
      <div key={key} className={"rounded-xl border p-4 " + borderBg}>
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
          <button onClick={onApply} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2f8f5b] px-4 text-[13px] font-bold text-white transition hover:bg-[#267a4f]">
            개선하기 →
          </button>
        )}
        {!canFix && sev !== "info" && (
          <span className="text-[12px] font-bold text-muted">직접 수정이 필요해요</span>
        )}
      </div>
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
      <div className="flex flex-col gap-1.5">
        {chapterGroups.map((group, gi) => {
          const isOpen = openGroups.has(gi);
          const start = group[0]?.num;
          const end = group[group.length - 1]?.num;
          const hasActive = group.some((c) => c.id === currentId);
          return (
            <div key={gi}>
              <button
                onClick={() => toggleGroup(gi)}
                className={"flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-canvas " + (hasActive ? "text-brand" : "text-muted")}
              >
                <span>{start === end ? `${start}화` : `${start}~${end}화`}</span>
                <span className={"inline-block text-[10px] transition-transform " + (isOpen ? "rotate-90" : "")}>▶</span>
              </button>
              {isOpen && (
                <div className="mt-1 flex flex-col gap-1">
                  {group.map((c) => {
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
              )}
            </div>
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
          <aside className="sticky top-[84px] flex max-h-[calc(100vh-104px)] w-[248px] flex-shrink-0 flex-col rounded-xl border border-hairline bg-white px-3 py-4">
            <div className="flex-shrink-0 px-1 pb-2.5 text-xs font-bold tracking-[0.02em] text-muted">회차 {chapters.length}</div>
            <div className="flex-1 overflow-y-auto">{chapterList}</div>
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
                <button onClick={() => setReviewPanelOpen((v) => !v)} disabled={reviewing} className={"inline-flex h-11 items-center gap-1.5 rounded border px-4 text-sm font-bold transition " + (reviewing ? "border-brand/30 bg-wash text-brand/50 cursor-default" : "border-brand/40 bg-white text-brand hover:bg-wash")}>
                  {reviewing ? <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> 검토 중...</> : "✦ AI 검토"}
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

            {/* AI 검토 옵션 패널 — 대상·요청사항 선택 */}
            {reviewPanelOpen && (
              <div className="mt-3 rounded-lg border border-brand/30 bg-wash/50 p-3.5" style={{ animation: "pw-fade .15s ease" }}>
                <div className="mb-1.5 text-[13px] font-bold text-ink">✦ AI 검토 요청사항 <span className="font-normal text-muted">선택 · 비워두면 기본 5개 항목만 검토해요</span></div>
                <textarea
                  value={reviewInstruction}
                  onChange={(e) => setReviewInstruction(e.target.value)}
                  rows={2}
                  placeholder="예: 전투 장면 합·개연성 위주로 봐줘 / OO 캐릭터 말투 일관성 확인해줘"
                  className="w-full resize-none rounded-lg border border-hairline bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/50 focus:border-brand focus:shadow-focus"
                />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button onClick={() => runReview()} disabled={reviewing} className="inline-flex h-10 items-center rounded border border-brand/40 bg-white px-3.5 text-[13px] font-bold text-brand transition hover:bg-wash disabled:opacity-50">이 회차만 검토</button>
                  <button onClick={runReviewAll} disabled={reviewing} className="inline-flex h-10 items-center rounded bg-brand px-3.5 text-[13px] font-bold text-white transition hover:bg-brand-hover disabled:opacity-50">전체 {chapters.length}화 검토</button>
                  <button onClick={() => setReviewPanelOpen(false)} className="inline-flex h-10 items-center rounded px-3 text-[13px] font-bold text-muted hover:text-ink2">닫기</button>
                </div>
              </div>
            )}
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

      {/* AI 검토 모달 — 단일 회차 / 전체 회차 공용 */}
      {reviewMode && (reviewResult || reviewAllResult || reviewing) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" style={{ animation: "pw-fade .2s ease" }}>
          <div className="flex w-full max-w-[540px] flex-col rounded-t-2xl bg-white sm:max-h-[90vh] sm:rounded-2xl sm:shadow-xl" style={{ animation: "pw-sheet .25s ease" }}>

            {/* 헤더 */}
            <div className="flex-shrink-0 border-b border-hairline px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="text-[17px] font-bold text-ink">
                  {reviewMode === "all" ? "AI 검토 결과 · 전체 회차" : "AI 검토 결과"}
                  {reviewMode === "single" && reviewRound > 1 && <span className="ml-2 text-[13px] font-normal text-muted">{reviewRound}라운드</span>}
                </div>
                {reviewing ? (
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                    검토 중...
                  </span>
                ) : reviewMode === "single" && reviewResult ? (
                  <span className={"rounded-full px-3 py-1 text-[12px] font-bold " + (reviewResult.issues.filter(i => i.severity !== "info").length === 0 ? "bg-[#e8f5ee] text-[#2f8f5b]" : "bg-[#fff0f0] text-[#c0504e]")}>
                    {reviewResult.issues.filter(i => i.severity !== "info").length === 0 ? "✓ 이상 없음" : `⚠ ${reviewResult.issues.filter(i => i.severity !== "info").length}건 수정 권장`}
                  </span>
                ) : reviewMode === "all" && reviewAllResult ? (() => {
                  const failedCount = reviewAllResult.filter(r => r.failed).length;
                  const criticalCount = reviewAllResult.filter(r => !r.failed && r.issues.some(i => i.severity !== "info")).length;
                  if (failedCount === 0 && criticalCount === 0) {
                    return <span className="rounded-full bg-[#e8f5ee] px-3 py-1 text-[12px] font-bold text-[#2f8f5b]">✓ 이상 없음</span>;
                  }
                  return (
                    <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-[12px] font-bold text-[#c0504e]">
                      {failedCount > 0 && `⚠ ${failedCount}화 검토 실패`}
                      {failedCount > 0 && criticalCount > 0 && " · "}
                      {criticalCount > 0 && `⚠ ${criticalCount}/${reviewAllResult.length}화 수정 권장`}
                    </span>
                  );
                })() : null}
              </div>
              {reviewMode === "single" && reviewResult && <div className="mt-1.5 text-[13px] text-muted">{reviewResult.summary}</div>}
              {reviewMode === "all" && reviewing && !reviewAllResult && (
                <div className="mt-1.5 text-[13px] text-muted">{chapters.length}개 회차를 순차 검토 중이에요. 잠시만 기다려 주세요.</div>
              )}
            </div>

            {/* 이슈 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reviewing && !reviewResult && !reviewAllResult && (
                <div className="flex flex-col gap-3 py-2">
                  {[85, 100, 70, 90].map((w, i) => (
                    <div key={i} className="pw-skel" style={{ width: `${w}%`, height: 20 }} />
                  ))}
                </div>
              )}

              {/* 단일 회차 결과 */}
              {reviewMode === "single" && reviewResult && reviewResult.issues.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mb-1.5 text-4xl">✓</div>
                  <div className="text-[15px] font-bold text-[#2f8f5b]">검토 이슈가 없어요!</div>
                  <div className="mt-1 text-[13px] text-muted">저장을 진행해 주세요.</div>
                </div>
              )}
              {reviewMode === "single" && reviewResult && reviewResult.issues.length > 0 && (
                <div className="flex flex-col gap-3">
                  {reviewResult.issues.map((issue, i) => renderIssueCard(issue, i, () => applyFix(issue)))}
                </div>
              )}

              {/* 전체 회차 결과 — 회차별 접이식 그룹 */}
              {reviewMode === "all" && reviewAllResult && (
                <div className="flex flex-col gap-2">
                  {reviewAllResult.map((r) => {
                    const critical = r.issues.filter(i => i.severity !== "info").length;
                    const isOpen = expandedSeqs.has(r.seq);
                    const isRetrying = retryingSeq === r.seq;
                    return (
                      <div key={r.seq} className={"rounded-xl border " + (r.failed ? "border-[#f3c98f] bg-[#fffaf0]" : "border-hairline")}>
                        <div className="flex w-full items-center justify-between gap-2 px-4 py-3">
                          <button
                            onClick={() => toggleExpand(r.seq)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <span className="flex-shrink-0 text-sm font-bold text-ink">{r.seq}화</span>
                            <span className="min-w-0 truncate text-[12px] text-muted">{r.summary}</span>
                          </button>
                          <span className="flex flex-shrink-0 items-center gap-2">
                            {r.failed ? (
                              <>
                                <span className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[11px] font-bold text-[#c0504e]">⚠ 검토 실패</span>
                                <button
                                  onClick={() => retryChapterReview(r.seq)}
                                  disabled={isRetrying}
                                  className="rounded-full border border-brand/40 bg-white px-2.5 py-1 text-[11px] font-bold text-brand transition hover:bg-wash disabled:opacity-50"
                                >
                                  {isRetrying ? "재시도 중..." : "재시도"}
                                </button>
                              </>
                            ) : (
                              <span className={"rounded-full px-2.5 py-1 text-[11px] font-bold " + (critical === 0 ? "bg-[#e8f5ee] text-[#2f8f5b]" : "bg-[#fff0f0] text-[#c0504e]")}>
                                {critical === 0 ? "✓ 이상 없음" : `⚠ ${critical}건`}
                              </span>
                            )}
                            <button onClick={() => toggleExpand(r.seq)} className="text-[10px] text-muted" aria-label="펼치기/접기">
                              <span className={"inline-block transition-transform " + (isOpen ? "rotate-90" : "")}>▶</span>
                            </button>
                          </span>
                        </div>
                        {isOpen && r.issues.length > 0 && (
                          <div className="flex flex-col gap-3 border-t border-hairline px-4 py-3">
                            {r.issues.map((issue, i) => renderIssueCard(issue, i, () => applyFix(issue, r.seq)))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 푸터 버튼 */}
            <div className="flex-shrink-0 border-t border-hairline px-6 py-4">
              {reviewMode === "single" ? (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setReviewResult(null); setReviewRound(0); setReviewMode(null); }}
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
                    onClick={async () => { await saveCurrentChapter(); setReviewResult(null); setReviewRound(0); setReviewMode(null); showToast("저장됐어요"); }}
                    className="h-11 flex-[2] rounded bg-brand text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                  >
                    {saving ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setReviewAllResult(null); setReviewMode(null); }}
                    className="h-11 flex-1 rounded border border-line2 bg-white text-sm font-bold text-ink2 transition hover:border-brand hover:text-brand"
                  >
                    닫기
                  </button>
                  {!reviewing && reviewAllResult && (
                    <button
                      disabled={savingAll}
                      onClick={saveAllReviewed}
                      className="h-11 flex-[2] rounded bg-brand text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                    >
                      {savingAll ? "저장 중..." : "적용한 수정사항 모두 저장"}
                    </button>
                  )}
                </div>
              )}
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

      {/* 스크롤 이동 FAB — 본문 위/아래로 부드럽게 이동 */}
      <div className={"fixed right-4 z-20 flex flex-col gap-2.5 " + (isMobile ? "bottom-24" : "bottom-6")}>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink2 shadow-[0_4px_16px_rgba(0,0,0,0.14)] transition hover:border-brand hover:text-brand active:scale-95"
        >
          ▲
        </button>
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
          aria-label="맨 아래로"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink2 shadow-[0_4px_16px_rgba(0,0,0,0.14)] transition hover:border-brand hover:text-brand active:scale-95"
        >
          ▼
        </button>
      </div>

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
