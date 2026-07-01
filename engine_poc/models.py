"""
models.py — 입력 설정 데이터 모델 (02·03 필수/선택 정보, 12 스키마와 정합).

  불변 설정(NovelSettings/Character/Relationship)과
  가변 누적 상태(StoryBible/ChapterSummary)를 분리한다(13 §2의 핵심 아이디어).
"""
from dataclasses import dataclass, field
import json


# ── 불변 설정 ────────────────────────────────────────────────────────────
@dataclass
class Character:
    name: str
    appearance: str = ""      # 외형 (02 §2)
    trait: str = ""           # 신체적 특징
    personality: str = ""     # 성격
    role: str = "supporting"  # protagonist/supporting/antagonist/helper
    desire: str = ""          # 핵심 욕망 (행동 일관성)
    fear: str = ""            # 핵심 두려움 (갈등 반응)
    mannerism: str = ""       # 말버릇/행동 습관
    secret: str = ""          # 비밀 (내러티브 복선용, 독자 비공개)


@dataclass
class RelationStage:
    stage: str   # 발단/전개/위기/절정
    label: str   # 동료/연인/원수 ...


@dataclass
class Relationship:
    from_char: str
    to_char: str
    direction: str = "two_way"               # one_way/two_way
    timeline: list = field(default_factory=list)  # list[RelationStage] (02 §5)


@dataclass
class NovelSettings:
    title: str
    era: str                      # 배경 시대 (02 §1)
    genres: list                  # 장르 (02 §3)
    goal: str                     # 주인공 목표·동기 (02 §8)
    conflict: str                 # 핵심 갈등 (02 §9)
    story_flow: dict              # {발단,전개,위기,절정} 4단 흐름 (02 §4)
    ending: str                   # 결말 방향 (02 §11)
    pov: str                      # 화자 시점 (02 §10)
    total_chapters: int           # 총 회차 (02 §6)
    length: str = "normal"        # short/normal/long
    age_rating: str = "15"        # all/15/19 (02 §12)
    style: str = ""               # 문체·톤 (03 §1, 선택)
    world_rules: str = ""         # 세계관 설정 (03 §2, 선택)
    constraints: str = ""         # 세부 금기·제약 (03 §3, 선택)
    paragraph_length: str = "medium"  # short/medium/long — 문단 평균 길이
    characters: list = field(default_factory=list)       # list[Character]
    relationships: list = field(default_factory=list)    # list[Relationship]
    # 파워/능력 시스템
    power_system: dict = field(default_factory=dict)
    # 감정 목표 & 레퍼런스
    emotional_goal: str = ""
    reference_work: str = ""
    cliffhanger_style: str = ""
    # 복선 계획: [{"hint": "...", "revealChapter": N}, ...]
    foreshadowing: list = field(default_factory=list)
    # 회차 패턴
    chapter_rhythm: dict = field(default_factory=dict)


# ── 가변 누적 상태 (13 §2 / 12 story_bible·chapter_summaries) ─────────────
@dataclass
class ChapterSummary:
    seq: int
    summary_short: str = ""          # 2~3문장 압축 (다음 회차 컨텍스트용)
    state_delta: list = field(default_factory=list)   # 이 회차에서 바뀐 상태
    open_threads: list = field(default_factory=list)  # 미회수 복선
    last_scene: str = ""             # 마지막 장면 원문 일부(클리프행어 이어받기)


@dataclass
class StoryBible:
    glossary: dict = field(default_factory=dict)       # 고유명사 사전
    open_threads: list = field(default_factory=list)   # 작품 전역 미회수 복선
    summaries: list = field(default_factory=list)      # list[ChapterSummary]
    # 최초 회차 생성 시점의 총 회차 수 스냅샷. 이후 사용자가 totalChapters를 바꿔도
    # 이미 진행 중인 작품의 스테이지(발단/전개/위기/절정) 계산 기준이 흔들리지 않게 고정한다.
    total_chapters: int | None = None


# ── 로더 ────────────────────────────────────────────────────────────────
def load_novel(path) -> NovelSettings:
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    chars = [Character(**c) for c in d.get("characters", [])]
    rels = []
    for r in d.get("relationships", []):
        tl = [RelationStage(**s) for s in r.get("timeline", [])]
        rels.append(Relationship(
            from_char=r["from_char"], to_char=r["to_char"],
            direction=r.get("direction", "two_way"), timeline=tl))
    return NovelSettings(
        title=d["title"], era=d["era"], genres=d["genres"],
        goal=d["goal"], conflict=d["conflict"], story_flow=d["story_flow"],
        ending=d["ending"], pov=d["pov"], total_chapters=d["total_chapters"],
        length=d.get("length", "normal"), age_rating=d.get("age_rating", "15"),
        style=d.get("style", ""), world_rules=d.get("world_rules", ""),
        constraints=d.get("constraints", ""),
        characters=chars, relationships=rels)
