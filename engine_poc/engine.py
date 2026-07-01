"""
engine.py — 생성 엔진 코어 (13 §3·§4).

  - 4단 구조 ↔ 회차 매핑 (stage_of)
  - 관계 타임라인 해석기 (resolve_relationship, 13 §4-1)  ← 차별화 핵심
  - 회차 생성 + 스토리 바이블 갱신 루프 (generate_chapter, 13 §4-2)
"""
import json
import re

import config
import llm
import prompts
from models import ChapterSummary, StoryBible

# 4단 구조 단계와 회차 경계 비율 (13 §4-1)
STAGES = ["발단", "전개", "위기", "절정"]
STAGE_BOUNDS = [(0.0, 0.25), (0.25, 0.60), (0.60, 0.85), (0.85, 1.0001)]


def stage_of(seq, total):
    """현재 회차가 4단 구조의 어느 단계인지."""
    frac = (seq - 1) / max(total, 1)
    for i, (lo, hi) in enumerate(STAGE_BOUNDS):
        if lo <= frac < hi:
            return STAGES[i]
    return STAGES[-1]


def _stage_idx(stage):
    return STAGES.index(stage) if stage in STAGES else 0


def _stage_start_seq(stage, total):
    return int(STAGE_BOUNDS[_stage_idx(stage)][0] * total) + 1


# ── 관계 타임라인 해석기 (13 §4-1) ───────────────────────────────────────
def resolve_relationship(rel, seq, total):
    """현재 회차 시점의 관계 라벨 + 다가오는 전환(라벨, 남은 회차, 단계)을 산출.

    이게 '단순 생성기'와의 결정적 차이: 관계가 갑자기 바뀌지 않고 빌드업된다.
    """
    cur_idx = _stage_idx(stage_of(seq, total))
    tl = sorted(rel.timeline, key=lambda s: _stage_idx(s.stage))

    current = tl[0].label if tl else "관계"
    for s in tl:                       # 현재 단계 이하의 가장 최근 라벨
        if _stage_idx(s.stage) <= cur_idx:
            current = s.label

    upcoming = None                    # 현재 이후 첫 '라벨이 바뀌는' 지점
    for s in tl:
        if _stage_idx(s.stage) > cur_idx and s.label != current:
            start = _stage_start_seq(s.stage, total)
            upcoming = (s.label, max(start - seq, 1), s.stage)
            break
    return current, upcoming


def relation_lines(novel, seq):
    """계층2에 주입할 '관계 현재 상태' 문장들."""
    out = []
    for rel in novel.relationships:
        cur, up = resolve_relationship(rel, seq, novel.total_chapters)
        line = f"{rel.from_char} → {rel.to_char}: 현재 '{cur}'"
        if up:
            label, dist, stage = up
            line += f" / {dist}화 뒤({stage}) '{label}'로 전환 예정 — 지금부터 복선을 깔 것"
        out.append(line)
    return out


def four_act_line(novel):
    sf = novel.story_flow
    return " · ".join(f"{k}: {sf.get(k, '')}" for k in STAGES if sf.get(k))


# ── 컨텍스트 어셈블 (13 §3·§4-3) ─────────────────────────────────────────
def assemble(novel, seq, bible: StoryBible, user_note: str = ""):
    system = prompts.build_system(novel)
    recent = bible.summaries[-config.RECENT_SUMMARY_WINDOW:]
    context = prompts.build_context(
        novel, seq,
        four_act_line(novel),
        relation_lines(novel, seq),
        recent,
        bible.open_threads,
        bible.glossary,
    )
    last_scene = bible.summaries[-1].last_scene if bible.summaries else ""
    task = prompts.build_task(novel, seq, stage_of(seq, novel.total_chapters), last_scene, user_note=user_note)
    return system, f"{context}\n\n{task}"


# ── 회차 생성 + 갱신 루프 ────────────────────────────────────────────────
def generate_chapter(novel, seq, bible: StoryBible, user_note: str = ""):
    system, user = assemble(novel, seq, bible, user_note=user_note)
    text = llm.generate("prose", system, user, label=f"ch{seq}")

    # §5-1 분량 가드: 너무 짧으면 이어쓰기 1회
    target = config.LENGTH_TARGETS.get(novel.length, 4000)
    if config.ENFORCE_LENGTH and len(text) < target * config.LENGTH_TOLERANCE:
        cont = llm.generate(
            "prose", system,
            f"아래는 {seq}화의 앞부분이다. 끊긴 지점부터 자연스럽게 이어, "
            f"목표 분량({target}자)을 채우고 클리프행어로 마무리하라. 이어지는 본문만 출력.\n\n{text}",
            label=f"ch{seq}-cont")
        text = text.rstrip() + "\n\n" + cont.lstrip()

    summary = writeback(novel, seq, text, bible)   # §4-2 스토리 바이블 갱신
    return text, summary


MAX_OPEN_THREADS = 15  # 열린 복선 누적 캡 — 넘으면 오래된 것부터 제거


def writeback(novel, seq, text, bible: StoryBible) -> ChapterSummary:
    """본문 → 요약·상태 추출 → 스토리 바이블 갱신 (13 §4-2).
    AI 생성 직후뿐 아니라, 사람이 회차를 수동으로 고친 뒤에도 동일하게 호출해
    수동 편집 내용이 다음 회차 컨텍스트에 반영되게 한다."""
    raw = llm.generate("extract", "너는 정확한 요약 도우미다.",
                       prompts.build_extract_prompt(seq, text), label=f"ch{seq}-extract")
    data = _parse_json(raw)
    summary = ChapterSummary(
        seq=seq,
        summary_short=data.get("summary_short", "").strip(),
        state_delta=data.get("state_delta", []) or [],
        open_threads=data.get("open_threads", []) or [],
        last_scene=_tail(text, 280),
    )
    # 같은 회차를 재생성/수동편집해서 다시 writeback하는 경우 요약이 중복 누적되지 않도록,
    # 기존 seq 항목은 제거하고 새 요약으로 교체한다.
    bible.summaries = [s for s in bible.summaries if s.seq != seq] + [summary]
    # last_scene은 assemble()에서 가장 최근 회차 것만 읽힌다 — 나머지는 회차당 최대 280자를
    # 영구히 죽은 채로 저장하게 되므로, 최신 항목을 제외하고는 비워서 스토리 바이블 크기를 줄인다.
    for s in bible.summaries[:-1]:
        s.last_scene = ""
    # 작품 전역 열린 복선 = 이전 목록과 병합(교집합 유지) + 중복 제거 + 캡.
    # 예전엔 이번 회차 추출분으로 통째로 덮어써서, 언급 안 된 이전 복선이 사라졌음.
    if summary.open_threads:
        merged = list(bible.open_threads)
        for t in summary.open_threads:
            if t not in merged:
                merged.append(t)
        bible.open_threads = merged[-MAX_OPEN_THREADS:]
    # 자동 추출된 고유명사는 기존 표기(위저드 시딩분 포함)를 덮어쓰지 않고 빈 자리만 채운다.
    new_terms = data.get("new_terms") or {}
    if isinstance(new_terms, dict):
        for term, meaning in new_terms.items():
            if term and term not in bible.glossary:
                bible.glossary[term] = meaning
    return summary


def _tail(text, n):
    body = re.sub(r"^#.*\n", "", text).strip()   # 제목 줄 제거
    return body[-n:]


def _parse_json(raw):
    raw = raw.strip()
    m = re.search(r"\{.*\}", raw, re.S)           # 코드펜스/잡설 대비
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {"summary_short": raw[:200], "state_delta": [], "open_threads": []}
