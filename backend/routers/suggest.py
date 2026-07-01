"""
AI 자동완성 제안 엔드포인트
  POST /api/suggest/world     → 세계관 (세력·계급·용어·월드맵) 자동생성
  POST /api/suggest/relations → 인물 관계도 자동생성
"""
import json, math, os, re, logging
from fastapi import APIRouter, Depends, Body, HTTPException
from auth import get_current_user
from db import get_db
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
    {{"name": "세력명", "category": "분류({cats_instr})", "leader": "수장 직함", "desc": "한 줄 설명", "costume": "단체 복식·의상 설명 (없으면 빈 문자열)", "parentIndex": -1}}
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
- costume: 이 세력·집단의 단체 복식·의상을 1문장으로 묘사. 교복·단복·갑옷 등. 없으면 ""
- ranks는 반드시 factions에서 사용한 수장 직함(leader)을 최상위 계급으로 포함해야 합니다.
  예) 세력 수장이 "장문인"이면 ranks에 {{"name":"장문인","desc":"문파 최고 수장","variants":[]}}가 있어야 합니다.
- ranks 전체 계급은 모든 세력을 아우르는 통합 체계로 4~6개, 상위→하위 순으로 작성
- 모두 한국어, 시대/장르에 맞는 용어 사용"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )
    if msg.stop_reason == "max_tokens":
        logger.error("suggest_world truncated at max_tokens (output=%s)", msg.usage.output_tokens)
        raise HTTPException(status_code=502, detail="세계관이 너무 길어 생성이 중단됐어요. 다시 시도해 주세요.")
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
    user_prompt = (body.get("prompt") or "").strip()
    existing_edges = body.get("existingEdges", [])

    if len(characters) < 2:
        return {"edges": []}

    char_lines = "\n".join(
        f"{i}. {c.get('name','?')} ({'주인공' if c.get('role')=='protagonist' else '조연/악역'}) - {c.get('personality','')}"
        for i, c in enumerate(characters)
    )

    # 현재 관계도(있다면) — 프롬프트로 수정/보완할 때 기준선으로 사용
    existing_str = ""
    if isinstance(existing_edges, list) and existing_edges:
        ex_lines = []
        for e in existing_edges:
            fi, ti = e.get("fromIndex"), e.get("toIndex")
            if not isinstance(fi, int) or not isinstance(ti, int):
                continue
            if fi < 0 or ti < 0 or fi >= len(characters) or ti >= len(characters):
                continue
            fname = characters[fi].get("name", "?")
            tname = characters[ti].get("name", "?")
            arrow = "↔" if e.get("direction") == "both" else "→"
            ex_lines.append(f"  - {fname} {arrow} {tname}: {e.get('relation', '')}")
        if ex_lines:
            existing_str = "\n현재 관계도 (이미 설정된 상태):\n" + "\n".join(ex_lines)

    prompt_instr = ""
    if user_prompt:
        prompt_instr = f"""

[사용자 프롬프트 — 최우선으로 반영]
{user_prompt}

- 위 지시에서 언급된 인물·관계는 그 내용을 정확히 반영해서 edges를 만드세요.
- 지시에서 언급되지 않은 인물 쌍은 '현재 관계도'가 있으면 그대로 유지하고, 없으면 서사에 맞게 자연스럽게 새로 보완하세요.
- 사용자가 일부만 대충 적었더라도 전체 인물의 관계도가 빠짐없이 완성되도록 나머지를 채우세요."""

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
총 회차: {total_chapters}{flow_lines}{existing_str}{prompt_instr}

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
    # 프롬프트·기존 관계도가 있으면 그만큼 응답이 길어지므로 여유분 추가
    char_count = len(characters)
    dynamic_tokens = min(800 + char_count * 600, 12000)
    if existing_str:
        dynamic_tokens = min(dynamic_tokens + 1500, 12000)
    if prompt_instr:
        dynamic_tokens = min(dynamic_tokens + 1000, 12000)

    try:
        msg = _ai().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=dynamic_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as e:
        logger.error("suggest_relations API call failed: %s", e)
        raise HTTPException(status_code=500, detail="관계도 자동 생성에 실패했어요. 잠시 후 다시 시도해 주세요.")

    if msg.stop_reason == "max_tokens":
        logger.error("suggest_relations truncated at max_tokens (output=%s)", msg.usage.output_tokens)
        raise HTTPException(status_code=502, detail="관계도가 너무 길어 생성이 중단됐어요. 인물 수를 줄이거나 프롬프트를 간결하게 줄여서 다시 시도해 주세요.")

    data = _parse_json(msg.content[0].text)
    if not isinstance(data.get("edges"), list):
        return {"edges": []}
    return data


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
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    if msg.stop_reason == "max_tokens":
        logger.error("suggest_narrative truncated at max_tokens (output=%s)", msg.usage.output_tokens)
        raise HTTPException(status_code=502, detail="서사 생성이 너무 길어 중단됐어요. 다시 시도해 주세요.")
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

    prompt = f"""당신은 한국 웹소설 제목 카피라이터입니다. 첫 줄만 보고도 클릭하게 만드는 '후킹 제목'을 뽑습니다.
아래 설정에 맞는 제목 후보 6개를 JSON으로 만들어주세요.

[설정]
배경: {era}
장르: {', '.join(genres) if genres else '미정'}
주인공: {hero_name or '미정'}
목표: {goal or '없음'}
갈등: {conflict or '없음'}
결말 방향: {ending or '없음'}
시점: {pov or '없음'}

[요즘 한국 웹소설 제목 트렌드 — 참고만, 베끼지 말 것]
- 상황·반전을 한 문장으로 압축한 '문장형' 제목이 대세
  예) "전지적 독자 시점", "나 혼자만 레벨업", "악역의 엔딩은 죽음뿐", "내가 키운 S급들", "회귀한 천재 헌터의 일상"
- 핵심 후크(회귀/빙의/정체 숨김/계약/먼치킨/반전)를 제목에 드러내 호기심을 건다
- "~인 줄 알았다 / ~하기로 했다 / 알고 보니 ~ / ~가 되었다" 같은 어미로 궁금증 유발

반드시 아래 JSON만 응답하세요:
{{"titles": ["제목1", "제목2", "제목3", "제목4", "제목5", "제목6"]}}

[조건]
- 6개 중 최소 4개는 긴 문장형(10~25자), 나머지는 임팩트 있는 짧은 제목(2~8자)
- 이 작품만의 고유 소재(세계관·인물 이름·갈등)를 실제로 녹여서 진부하지 않게
- 흔한 클리셰 범벅 금지 — 이 작품만의 '한 끗'을 제목에 담을 것
- 장르 감성이 제목에서 바로 느껴지게, 모두 한국어"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json(msg.content[0].text)


@router.post("/review")
async def review_chapter(body: dict = Body(...), user=Depends(get_current_user)):
    """회차 원고를 위저드 설정과 비교해 AI 검토 후 구조화된 피드백 반환."""
    novel_id = body.get("novelId", "")
    seq = int(body.get("seq", 1))
    content = body.get("content", "").strip()

    if not content:
        raise HTTPException(status_code=400, detail="내용이 비어있어요")

    # DB에서 작품 설정 및 이전 회차 가져오기
    db = get_db()
    novel_row = (
        db.table("novels")
        .select("title, settings")
        .eq("id", novel_id)
        .eq("author_id", str(user.id))
        .single()
        .execute()
    )
    if not novel_row.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")

    title = novel_row.data["title"]
    settings = novel_row.data["settings"] or {}
    era = settings.get("era", "")
    genres = settings.get("genres", [])
    world_rules = settings.get("worldRules", "")
    conflict = settings.get("conflict", "")
    goal = settings.get("goal", "")
    characters = settings.get("characters", [])
    relationships = settings.get("relationships", [])

    # 등장인물 요약
    char_lines = []
    for c in characters[:8]:
        name = c.get("name", "?")
        role = c.get("role", "?")
        personality = c.get("personality", "")
        speech = c.get("mannerism", "")
        line = f"  - {name}({role})"
        if personality:
            line += f": 성격={personality}"
        if speech:
            line += f", 말투·버릇={speech}"
        char_lines.append(line)
    char_str = "\n".join(char_lines) or "  미정"

    # 관계도 요약
    rel_lines = []
    for r in relationships[:6]:
        rel_lines.append(f"  - {r.get('fromChar', '?')} ↔ {r.get('toChar', '?')}: {r.get('relation', '')}")
    rel_str = "\n".join(rel_lines) if rel_lines else "  없음"

    # 이전 회차 마지막 500자 (연결성 확인)
    prev_block = ""
    if seq > 1:
        prev = (
            db.table("chapters")
            .select("content")
            .eq("novel_id", novel_id)
            .eq("seq", seq - 1)
            .single()
            .execute()
        )
        if prev.data and prev.data.get("content"):
            snippet = prev.data["content"][-500:]
            prev_block = f"\n[{seq - 1}화 마지막 부분 — 연결성 확인]\n{snippet}\n"

    prompt = f"""당신은 웹소설 검수·교정 전문가입니다. 아래 {seq}화 원고를 작품 설정과 대조해 꼼꼼히 검토하세요.

[작품 설정]
제목: {title}
배경·시대: {era}
장르: {', '.join(genres) if genres else '미정'}
주인공 목표: {goal or '없음'}
핵심 갈등: {conflict or '없음'}
세계 규칙: {world_rules or '없음'}

[등장인물]
{char_str}

[인물 관계]
{rel_str}
{prev_block}
[{seq}화 원고 (검토 대상)]
{content[:4000]}

아래 5가지를 검토하고, 반드시 JSON만 반환하세요 (설명·마크다운 없이):

① 시대·배경 고증 — 해당 시대·세계에 없는 단어·사물·개념·기술
② 인물 일관성 — 설정한 성격·말투와 다른 행동이나 대사
③ 문장 구조 — 어색한 표현, 과도한 반복, 읽기 불편한 문장
④ 대사 자연성 — 부자연스러운 한국어 대화체, 어색한 호칭
⑤ 흐름·연결성 — 갑작스러운 전환, 논리 비약, 이전 회차와 불연속

{{
  "ok": true,
  "summary": "총평 한 줄 (30자 이내)",
  "issues": [
    {{
      "type": "시대고증|인물일관성|문장구조|대사|흐름",
      "severity": "error|warning|info",
      "text": "구체적 문제 설명 (1~2문장)",
      "quote": "원고에서 문제가 되는 구절을 한 문장 이내로 그대로 복사. 찾을 수 없으면 빈 문자열.",
      "suggestion": "quote를 대체할 개선된 표현. quote와 동일한 위치에 바로 치환할 수 있도록 자연스럽게 작성. quote가 없으면 빈 문자열."
    }}
  ]
}}

규칙:
- quote는 원고 원문을 그대로 복사해야 함 (요약·수정 금지)
- suggestion은 quote 자리에 바로 들어가도 문맥이 자연스러워야 함
- 문제 없으면 issues=[], ok=true
- error 1개 이상이면 ok=false"""

    msg = _ai().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    if msg.stop_reason == "max_tokens":
        logger.error("review_chapter truncated at max_tokens (output=%s)", msg.usage.output_tokens)
        raise HTTPException(status_code=502, detail="검토 결과가 너무 길어 생성이 중단됐어요. 다시 시도해 주세요.")
    return _parse_json(msg.content[0].text)
