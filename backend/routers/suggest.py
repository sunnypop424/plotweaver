"""
AI 자동완성 제안 엔드포인트
  POST /api/suggest/world     → 세계관 (세력·계급·용어·월드맵) 자동생성
  POST /api/suggest/relations → 인물 관계도 자동생성
"""
import json, math, os, re, logging
from fastapi import APIRouter, Depends, Body, HTTPException
from auth import get_current_user
import anthropic
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()
router = APIRouter(prefix="/api/suggest", tags=["suggest"])

COLORS = ["#816bff", "#2a6fdb", "#1f8a5b", "#d9822b", "#c0504e", "#242537", "#a892ff", "#4a9be0"]

_client = None
def _ai():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client

def _parse_json(text: str) -> dict:
    text = text.strip()
    # 1. 직접 파싱 (Claude가 순수 JSON만 반환한 경우)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 2. 마크다운 코드 블록 (greedy 매칭으로 중첩 괄호 안전하게 처리)
    m = re.search(r"```(?:json)?\s*(\{[\s\S]+\})\s*```", text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 3. 텍스트 중 JSON 객체 추출 (greedy)
    m = re.search(r"\{[\s\S]+\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    safe_preview = text[:300].encode("ascii", "replace").decode("ascii")
    logger.error("JSON parse failed | preview: %s", safe_preview)
    raise HTTPException(status_code=502, detail="AI 응답 파싱 실패")


@router.post("/world")
async def suggest_world(body: dict = Body(...), user=Depends(get_current_user)):
    era = body.get("era", "")
    genres = body.get("genres", [])
    synopsis = body.get("synopsis", "")
    world_rules = body.get("worldRules", "")
    faction_cats = body.get("factionCats", [])

    cats_instr = f"반드시 아래 분류 중 하나만 사용하세요: {', '.join(faction_cats)}" if faction_cats else "배경에 맞는 분류를 자유롭게 사용하세요"

    prompt = f"""당신은 웹소설 세계관 설계 전문가입니다.
다음 정보를 바탕으로 웹소설 세계관 초안을 JSON으로 만들어주세요.

배경 시대: {era}
장르: {', '.join(genres) if genres else '미정'}
시놉시스: {synopsis or '없음'}
기존 세계 규칙: {world_rules or '없음'}

반드시 아래 JSON만 응답하세요 (마크다운·설명 없이):

{{
  "factions": [
    {{"name": "세력명", "category": "분류({cats_instr})", "leader": "수장 직함", "desc": "한 줄 설명", "parentIndex": -1}}
  ],
  "ranks": [
    {{"name": "계급명", "desc": "설명", "variants": ["세부직위1", "세부직위2"]}}
  ],
  "glossary": [
    {{"term": "용어", "category": "지명|무공|마법|아이템 등", "meaning": "뜻"}}
  ],
  "worldRules": "이 세계의 핵심 규칙 1~2문장",
  "taboos": "이 세계의 금기 1~2문장",
  "regions": [
    {{"name": "지역명", "factionIndex": 0, "desc": "한 줄 설명"}}
  ],
  "mapEdges": [
    {{"fromIndex": 0, "toIndex": 1, "label": "교역로|동맹|적대 등", "desc": ""}}
  ]
}}

[핵심 조건]
- factions 3~5개, glossary 4~6개, regions 각 세력 거점 + 중립지대(factionIndex=-1), mapEdges 2~4개
- parentIndex: 상위 소속 세력이 있으면 factions 배열 내 0-기반 인덱스, 없으면 -1
- ranks는 반드시 factions에서 사용한 수장 직함(leader)을 최상위 계급으로 포함해야 합니다.
  예) 세력 수장이 "장문인"이면 ranks에 {{"name":"장문인","desc":"문파 최고 수장","variants":[]}}가 있어야 합니다.
- ranks 전체 계급은 모든 세력을 아우르는 통합 체계로 4~6개, 상위→하위 순으로 작성
- 모두 한국어, 시대/장르에 맞는 용어 사용"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3500,
        messages=[{"role": "user", "content": prompt}],
    )
    data = _parse_json(msg.content[0].text)

    # 색상 및 메타 추가 (parentIndex는 프론트에서 ID로 변환)
    for i, f in enumerate(data.get("factions", [])):
        f["color"] = COLORS[i % len(COLORS)]
        f.setdefault("categoryCustom", False)
        f.setdefault("parentIndex", -1)
        f["parentId"] = ""  # 프론트에서 parentIndex → 실제 ID로 매핑

    # 지역 위치 (원형 배치)
    regions = data.get("regions", [])
    cx, cy, radius = 300, 240, 175
    for i, reg in enumerate(regions):
        angle = (2 * math.pi * i / max(len(regions), 1)) - math.pi / 2
        reg["x"] = int(cx + radius * math.cos(angle))
        reg["y"] = int(cy + radius * math.sin(angle))

    for t in data.get("glossary", []):
        t.setdefault("categoryCustom", False)

    return data


@router.post("/relations")
async def suggest_relations(body: dict = Body(...), user=Depends(get_current_user)):
    characters = body.get("characters", [])
    goal = body.get("goal", "")
    conflict = body.get("conflict", "")
    total_chapters = body.get("totalChapters", 10)
    story_flow = body.get("storyFlow", {})

    if len(characters) < 2:
        return {"edges": []}

    char_lines = "\n".join(
        f"{i}. {c.get('name','?')} ({'주인공' if c.get('role')=='protagonist' else '조연/악역'}) - {c.get('personality','')}"
        for i, c in enumerate(characters)
    )

    # 기승전결을 회차 구간으로 변환 (균등 분배)
    n = max(total_chapters, 1)
    phase_ep = {
        "발단": (1, max(1, n // 4)),
        "전개": (max(1, n // 4) + 1, max(1, n // 2)),
        "위기": (max(1, n // 2) + 1, max(1, 3 * n // 4)),
        "절정": (max(1, 3 * n // 4) + 1, n),
    }
    flow_lines = ""
    if story_flow:
        flow_lines = "\n서사 단계별 내용:\n" + "\n".join(
            f"- {k}(~{phase_ep[k][1]}화): {story_flow.get(k, '')}"
            for k in ["발단", "전개", "위기", "절정"] if story_flow.get(k)
        )

    prompt = f"""당신은 웹소설 관계도 전문가입니다.
다음 인물들의 관계도를 JSON으로 만들어주세요.

인물:
{char_lines}

주인공 목표: {goal or '없음'}
핵심 갈등: {conflict or '없음'}
총 회차: {total_chapters}{flow_lines}

반드시 아래 JSON만 응답하세요:

{{
  "edges": [
    {{
      "fromIndex": 0,
      "toIndex": 1,
      "relation": "연인|원수|동료|사제|형제|동맹|배신자 중 하나",
      "direction": "both",
      "timeline": [
        {{"ep": 3, "fromLabel": "이전 관계", "toLabel": "변화된 관계"}}
      ]
    }}
  ]
}}

조건:
- fromIndex/toIndex는 위 인물 번호
- 전체 인물 쌍 중 의미 있는 관계만 edge로 만든다. 서로 모르는 사이에는 edge를 만들지 않는다.
- timeline은 서사 단계 전환 시점에 관계가 바뀌는 경우만 기록 (없어도 됨)
- ep 범위: 1~{total_chapters}
- direction: "both"(양방향) 또는 "one"(단방향)
- 서사 흐름(발단→전개→위기→절정)에 맞게 관계 변화 시점을 배치
- 한국어로 작성"""

    # 인물 수에 따라 토큰 동적 증가: 쌍 수 = N*(N-1)/2 × 약 100토큰 + 여유
    char_count = len(characters)
    dynamic_tokens = min(500 + char_count * 400, 8000)

    try:
        msg = _ai().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=dynamic_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _parse_json(msg.content[0].text)
        if not isinstance(data.get("edges"), list):
            return {"edges": []}
        return data
    except Exception as e:
        logger.error("suggest_relations error: %s", e)
        raise HTTPException(status_code=500, detail="관계도 자동 생성에 실패했어요. 잠시 후 다시 시도해 주세요.")


@router.post("/characters")
async def suggest_characters(body: dict = Body(...), user=Depends(get_current_user)):
    era = body.get("era", "")
    genres = body.get("genres", [])
    world_factions = body.get("worldFactions", [])
    world_ranks = body.get("worldRanks", [])
    world_rules = body.get("worldRules", "")
    char_count = max(3, min(int(body.get("count", 5)), 15))
    supporting_count = char_count - 2  # protagonist 1 + villain 1 고정

    if world_factions:
        faction_instr = f"반드시 아래 세력 목록 중 하나만 사용하세요: {', '.join(world_factions)}"
    else:
        faction_instr = "세력 미정 — 배경 시대에 어울리는 세력명을 자유롭게 지어주세요."

    if world_ranks:
        rank_instr = f"반드시 아래 계급·직급 목록 중 하나만 사용하세요: {', '.join(world_ranks)}"
    else:
        rank_instr = "계급 미정 — 배경 시대에 어울리는 지위명을 자유롭게 지어주세요."

    prompt = f"""당신은 웹소설 인물 설계 전문가입니다.
아래 세계관에 어울리는 인물 총 {char_count}명을 JSON으로 만들어주세요.

배경 시대: {era}
장르: {', '.join(genres) if genres else '미정'}
세계 규칙: {world_rules or '없음'}

[소속 세력 규칙] {faction_instr}
[계급·직급 규칙] {rank_instr}

반드시 아래 JSON만 응답하세요:

{{
  "characters": [
    {{
      "name": "이름",
      "gender": "남성|여성|알수없음",
      "age": 25,
      "status": "귀족|평민|무인|관리|상인 등 신분",
      "faction": "소속 세력",
      "rank": "지위/직급",
      "appearance": "외형 키워드 한 단어 (예: 흑발, 백발, 붉은눈)",
      "trait": "신체·체형 특징 한 줄 (예: 날렵한 체형에 왼쪽 뺨의 흉터)",
      "personality": "성격 한 단어",
      "role": "protagonist|supporting|villain",
      "desc": "인물 소개 한 줄"
    }}
  ]
}}

조건: protagonist 1명, supporting {supporting_count}명, villain 1명 (총 {char_count}명). 한국어, 시대에 맞는 이름 사용.
appearance는 외형 옵션 중 하나(흑발·백발·금발·붉은눈·이색눈·상처·문신·독특한복장·미형·평범 중 하나). trait은 신체 특징 구체적 묘사."""

    # 인물 1명당 ~600 토큰, 안전 여유 1000 추가
    max_tokens = min(1000 + char_count * 600, 8000)
    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    data = _parse_json(msg.content[0].text)
    if not isinstance(data.get("characters"), list):
        raise HTTPException(
            status_code=502,
            detail=f"AI 응답이 불완전해요 (인물 수 {char_count}명). 인물 수를 줄이거나 다시 시도해 주세요."
        )
    return data


@router.post("/narrative")
async def suggest_narrative(body: dict = Body(...), user=Depends(get_current_user)):
    era = body.get("era", "")
    genres = body.get("genres", [])
    goal = body.get("goal", "")
    conflict = body.get("conflict", "")
    ending = body.get("ending", "")
    emotional_goal = body.get("emotionalGoal", "")
    reference_work = body.get("referenceWork", "")
    synopsis = body.get("synopsis", "")
    characters = body.get("characters", [])
    world_rules = body.get("worldRules", "")
    relationships = body.get("relationships", [])

    char_str = ", ".join(characters) if characters else "미정"

    rel_str = ""
    if relationships:
        rel_lines = [
            f"  - {r.get('fromChar', '?')} ↔ {r.get('toChar', '?')}: {r.get('relation', '')}"
            for r in relationships[:10]
        ]
        rel_str = "\n인물 관계:\n" + "\n".join(rel_lines)

    extra_str = ""
    if ending:
        extra_str += f"\n결말 방향: {ending}"
    if emotional_goal:
        extra_str += f"\n독자 감정 목표: {emotional_goal}"
    if reference_work:
        extra_str += f"\n참고 작품·분위기: {reference_work}"
    if synopsis:
        extra_str += f"\n한 줄 시놉시스: {synopsis}"

    prompt = f"""당신은 웹소설 서사 구조 전문가입니다.
아래 설정으로 기승전결 4단 구조를 JSON으로 만들어주세요.

배경: {era} / 장르: {', '.join(genres) if genres else '미정'}
주인공 목표: {goal or '없음'}
핵심 갈등: {conflict or '없음'}
등장인물: {char_str}{rel_str}
세계 규칙: {world_rules or '없음'}{extra_str}

반드시 아래 JSON만 응답하세요:

{{
  "ki": "기(발단) - 2~3문장으로 인물·배경·사건의 씨앗 소개",
  "seung": "승(전개) - 2~3문장으로 갈등 심화",
  "jeon": "전(위기) - 2~3문장으로 최고조·전환점",
  "gyeol": "결(절정·결말) - 2~3문장으로 해소와 마무리"
}}

조건:
- 등장인물 이름을 직접 언급해 일관성 있게 작성
- 세계 규칙에 어긋나지 않는 내용으로 구성
- 한국어로, 장르 분위기에 맞게 작성"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json(msg.content[0].text)


@router.post("/title")
async def suggest_title(body: dict = Body(...), user=Depends(get_current_user)):
    era = body.get("era", "")
    genres = body.get("genres", [])
    goal = body.get("goal", "")
    conflict = body.get("conflict", "")
    characters = body.get("characters", [])
    pov = body.get("pov", "")
    ending = body.get("ending", "")

    protagonist = next((c for c in characters if c.get("role") == "protagonist"), None)
    hero_name = protagonist.get("name", "") if protagonist else ""

    prompt = f"""당신은 웹소설 제목 전문가입니다.
아래 설정에 딱 맞는 웹소설 제목 후보 5개를 JSON으로 만들어주세요.

배경: {era}
장르: {', '.join(genres) if genres else '미정'}
주인공: {hero_name or '미정'}
목표: {goal or '없음'}
갈등: {conflict or '없음'}
결말 방향: {ending or '없음'}
시점: {pov or '없음'}

반드시 아래 JSON만 응답하세요:
{{"titles": ["제목1", "제목2", "제목3", "제목4", "제목5"]}}

조건:
- 한국 웹소설 감성에 맞는 제목 (2~8글자 혹은 짧은 문구)
- 장르 느낌이 제목에서 바로 느껴지게
- 주인공 이름이나 핵심 소재를 활용해도 좋음
- 모두 다른 스타일로 (짧은 것, 긴 것, 명사형, 동사형 등 다양하게)"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json(msg.content[0].text)
