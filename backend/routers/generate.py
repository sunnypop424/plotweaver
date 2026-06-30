"""
생성 엔드포인트
  POST /api/novels/{novel_id}/chapters  → 다음 회차 본문 생성
  POST /api/novels/{novel_id}/cover     → 표지 이미지 생성 (DALL-E 3)
"""
import os
import sys
from pathlib import Path

# engine_poc 임포트 (main.py에서도 sys.path에 추가하지만 직접 임포트 보장)
_engine_path = Path(__file__).parent.parent.parent / "engine_poc"
if str(_engine_path) not in sys.path:
    sys.path.insert(0, str(_engine_path))

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from db import get_db

import engine
from models import (
    NovelSettings, Character, Relationship, RelationStage, StoryBible, ChapterSummary
)

router = APIRouter()

STAGES = ["발단", "전개", "위기", "절정"]
STAGE_BOUNDS = [(0.0, 0.25), (0.25, 0.60), (0.60, 0.85), (0.85, 1.0001)]


def _ep_to_stage(ep: int, total: int) -> str:
    frac = (ep - 1) / max(total, 1)
    for i, (lo, hi) in enumerate(STAGE_BOUNDS):
        if lo <= frac < hi:
            return STAGES[i]
    return STAGES[-1]


def _char_trait(c: dict) -> str:
    """캐릭터 부가정보(성별·소속·계급·신분)를 trait 문자열로 합성"""
    parts = []
    if c.get("trait"):
        parts.append(c["trait"])
    if c.get("gender"):
        parts.append(f"성별={c['gender']}")
    if c.get("faction"):
        parts.append(f"소속={c['faction']}")
    if c.get("rank"):
        parts.append(f"계급={c['rank']}")
    if c.get("status"):
        parts.append(f"신분={c['status']}")
    return " / ".join(parts) if parts else ""


def _build_novel(settings: dict) -> NovelSettings:
    """위저드 settings dict → engine NovelSettings"""
    chars = [
        Character(
            name=c["name"],
            appearance=c.get("appearance", ""),
            trait=_char_trait(c),
            personality=c.get("personality", ""),
            role=c.get("role", "supporting"),
            desire=c.get("desire", ""),
            fear=c.get("fear", ""),
            mannerism=c.get("mannerism", ""),
            secret=c.get("secret", ""),
        )
        for c in settings.get("characters", [])
    ]

    total = settings.get("totalChapters", 10)
    rels = []
    for r in settings.get("relationships", []):
        tl_raw = r.get("timeline", [])
        # episode 번호를 stage로 변환
        tl = [
            RelationStage(stage=_ep_to_stage(item["ep"], total), label=item["toLabel"])
            for item in tl_raw
        ]
        # 초기 관계 (발단 단계) — timeline 첫 항목의 fromLabel 사용
        if tl_raw:
            tl.insert(0, RelationStage(stage="발단", label=tl_raw[0]["fromLabel"]))
        rels.append(Relationship(
            from_char=r["fromChar"],
            to_char=r["toChar"],
            direction="two_way" if r.get("direction", "both") == "both" else "one_way",
            timeline=tl,
        ))

    # length 매핑
    length_map = {"짧게 (2천자)": "short", "보통 (4천자)": "normal", "길게 (6천자+)": "long"}
    length = length_map.get(settings.get("length", "normal"), "normal")

    story_flow = settings.get("storyFlow", {})
    # 프론트의 {ki, seung, jeon, gyeol} → 엔진의 {발단, 전개, 위기, 절정}
    mapped_flow = {
        "발단": story_flow.get("발단", story_flow.get("ki", "")),
        "전개": story_flow.get("전개", story_flow.get("seung", "")),
        "위기": story_flow.get("위기", story_flow.get("jeon", "")),
        "절정": story_flow.get("절정", story_flow.get("gyeol", "")),
    }

    # 세계관 설명 조합
    glossary_dict = settings.get("glossaryDict", {})
    glossary_text = "\n".join(f"- {k}: {v}" for k, v in glossary_dict.items()) if glossary_dict else ""
    world_rules = settings.get("worldRules", "")
    # 세력/계급 정보 추가
    world_factions = settings.get("worldFactions", [])
    world_ranks = settings.get("worldRanks", [])
    extra_parts = []
    if world_factions:
        extra_parts.append("[주요 세력] " + ", ".join(world_factions))
    if world_ranks:
        extra_parts.append("[계급 체계] " + ", ".join(world_ranks))
    if extra_parts:
        world_rules = (world_rules + "\n" if world_rules else "") + "\n".join(extra_parts)
    if glossary_text:
        world_rules = world_rules + "\n[용어 사전]\n" + glossary_text if world_rules else glossary_text

    para_map = {"짧게": "short", "중간": "medium", "길게": "long"}
    paragraph_length = para_map.get(settings.get("paragraphLength", "중간"), "medium")

    return NovelSettings(
        title=settings.get("title", "무제"),
        era=settings.get("era", ""),
        genres=settings.get("genres", []),
        goal=settings.get("goal", ""),
        conflict=settings.get("conflict", ""),
        story_flow=mapped_flow,
        ending=settings.get("ending", ""),
        pov=settings.get("pov", "3인칭 전지적"),
        total_chapters=total,
        length=length,
        age_rating=settings.get("ageRating", "all"),
        style=settings.get("tone", ""),
        world_rules=world_rules,
        constraints=settings.get("constraints", ""),
        paragraph_length=paragraph_length,
        characters=chars,
        relationships=rels,
        power_system=settings.get("powerSystem") or {},
        emotional_goal=settings.get("emotionalGoal", ""),
        reference_work=settings.get("referenceWork", ""),
        cliffhanger_style=settings.get("cliffhangerStyle", ""),
        foreshadowing=settings.get("foreshadowing") or [],
        chapter_rhythm=settings.get("chapterRhythm") or {},
    )


def _bible_from_db(data: dict) -> StoryBible:
    summaries = [
        ChapterSummary(
            seq=s["seq"],
            summary_short=s.get("summary_short", ""),
            state_delta=s.get("state_delta", []),
            open_threads=s.get("open_threads", []),
            last_scene=s.get("last_scene", ""),
        )
        for s in data.get("summaries", [])
    ]
    return StoryBible(
        glossary=data.get("glossary", {}),
        open_threads=data.get("open_threads", []),
        summaries=summaries,
    )


def _bible_to_dict(bible: StoryBible) -> dict:
    return {
        "summaries": [
            {
                "seq": s.seq,
                "summary_short": s.summary_short,
                "state_delta": s.state_delta,
                "open_threads": s.open_threads,
                "last_scene": s.last_scene,
            }
            for s in bible.summaries
        ],
        "open_threads": bible.open_threads,
        "glossary": bible.glossary,
    }


def _extract_new_chars(text: str, settings: dict, novel_id: str, db) -> None:
    """회차 본문에서 새로 등장한 인물을 추출해 settings.characters에 추가. 실패 시 silent."""
    try:
        import json, re, os, anthropic

        existing = settings.get("characters", [])
        existing_names = {c["name"] for c in existing}

        # 앞 1500자만 사용해 haiku로 가볍게 추출
        excerpt = text[:1500]
        name_list = ", ".join(existing_names) if existing_names else "없음"

        prompt = f"""아래 웹소설 본문에서 **이름이 있고 대사 또는 행동이 묘사된 인물**만 추출하세요.
기존 인물 목록: {name_list}
조건: 기존 인물 제외 / 단역(1회 언급, 배경 인물) 제외 / 3명 이하로만 반환
반드시 아래 JSON만 응답하세요 (없으면 {{"characters":[]}}):
{{"characters":[{{"name":"이름","role":"supporting|villain","personality":"","appearance":""}}]}}

[본문]
{excerpt}"""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )

        m = re.search(r"\{[\s\S]+\}", msg.content[0].text)
        if not m:
            return
        data = json.loads(m.group(0))
        new_chars = data.get("characters", [])
        if not new_chars:
            return

        added = False
        for nc in new_chars:
            name = nc.get("name", "").strip()
            if not name or name in existing_names:
                continue
            existing.append({
                "name": name,
                "role": nc.get("role", "supporting"),
                "personality": nc.get("personality", ""),
                "appearance": nc.get("appearance", ""),
                "trait": "",
                "autoAdded": True,
            })
            existing_names.add(name)
            added = True

        if added:
            updated_settings = {**settings, "characters": existing}
            db.table("novels").update({"settings": updated_settings}).eq("id", novel_id).execute()
    except Exception:
        pass  # 회차 생성 자체에 영향 없도록 silent


class GenerateChapterRequest(BaseModel):
    seq: int = 1


class UpdateChapterRequest(BaseModel):
    content: str


@router.put("/novels/{novel_id}/chapters/{seq}")
def update_chapter(novel_id: str, seq: int, body: UpdateChapterRequest, user=Depends(get_current_user)):
    db = get_db()
    row = db.table("novels").select("id").eq("id", novel_id).eq("author_id", str(user.id)).single().execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    db.table("chapters").update({"content": body.content}).eq("novel_id", novel_id).eq("seq", seq).execute()
    return {"ok": True}


@router.post("/novels/{novel_id}/chapters")
def generate_chapter(novel_id: str, body: GenerateChapterRequest, user=Depends(get_current_user)):
    db = get_db()

    # 1. 작품 설정 조회
    novel_row = db.table("novels").select("*").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel_row.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")

    settings = novel_row.data["settings"]
    novel = _build_novel(settings)

    # 2. 스토리 바이블 조회
    bible_row = db.table("story_bibles").select("data").eq("novel_id", novel_id).single().execute()
    bible_data = bible_row.data["data"] if bible_row.data else {}
    bible = _bible_from_db(bible_data)

    # 3. 회차 생성 (동기, ~20-40초)
    try:
        text, _ = engine.generate_chapter(novel, body.seq, bible)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 실패: {str(e)}")

    # 4. 챕터 저장 (upsert)
    db.table("chapters").upsert({
        "novel_id": novel_id,
        "seq": body.seq,
        "content": text,
    }, on_conflict="novel_id,seq").execute()

    # 5. 스토리 바이블 갱신
    db.table("story_bibles").upsert({
        "novel_id": novel_id,
        "data": _bible_to_dict(bible),
        "updated_at": "NOW()",
    }, on_conflict="novel_id").execute()

    # 6. 신규 인물 자동 추출 (실패 시 silent)
    _extract_new_chars(text, settings, novel_id, db)

    return {"seq": body.seq, "content": text, "word_count": len(text)}


def _build_char_prompt(settings: dict, include_char: bool) -> str:
    """인물 설정 + 관계도에서 표지용 캐릭터 묘사 블록 생성"""
    if not include_char:
        return ""
    characters = settings.get("characters", [])
    if not characters:
        return ""
    protagonist = next((c for c in characters if c.get("role") == "protagonist"), None)
    if not protagonist:
        return ""

    # 주인공과 관계 있는 핵심 인물 탐색 (관계도 기반)
    relationships = settings.get("relationships", [])
    pname = protagonist.get("name", "")
    related_names: set[str] = set()
    for r in relationships:
        if r.get("fromChar") == pname:
            related_names.add(r.get("toChar", ""))
        elif r.get("toChar") == pname:
            related_names.add(r.get("fromChar", ""))
    related_names.discard("")

    # 관계 있는 인물 중 빌런 > 조연 우선으로 최대 1명 선택
    key_char = None
    for role in ("villain", "supporting"):
        candidates = [c for c in characters
                      if c.get("role") == role and c.get("name") in related_names]
        if candidates:
            key_char = candidates[0]
            break

    def _desc(c: dict) -> str:
        parts = []
        if c.get("gender"):
            parts.append(c["gender"])
        if c.get("appearance"):
            parts.append(c["appearance"])
        if c.get("personality"):
            parts.append(c["personality"])
        detail = ", ".join(parts)
        return f"{c.get('name', 'character')} ({detail})" if detail else c.get("name", "character")

    prot_desc = _desc(protagonist)
    if key_char:
        key_desc = _desc(key_char)
        return (
            f"Characters in the scene — Protagonist: {prot_desc}, placed prominently in the foreground with a dramatic pose. "
            f"Key figure: {key_desc}, visible alongside the protagonist. "
            "Both characters must be clearly recognizable with expressive, dynamic poses that reflect their personalities. "
        )
    else:
        return (
            f"Feature the protagonist alone: {prot_desc}. "
            "Protagonist is centered prominently with a dramatic, expressive pose that captures their personality. "
        )


@router.post("/novels/{novel_id}/cover")
def generate_cover(novel_id: str, body: dict = Body(default={}), user=Depends(get_current_user)):
    import openai, base64

    db = get_db()
    novel_row = db.table("novels").select("title, settings").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel_row.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")

    title = novel_row.data["title"]
    settings = novel_row.data["settings"]
    genres = ", ".join(settings.get("genres", []))
    era = settings.get("era", "")
    style = settings.get("coverStyle", "웹툰풍")

    include_title = body.get("includeTitle", False)
    include_author = body.get("includeAuthor", False)
    include_char = body.get("includeChar", True)
    author_name = body.get("authorName", "").strip()

    style_map = {
        "웹툰풍": "webtoon comic art style, Korean manhwa style",
        "유화풍": "oil painting style, dramatic lighting",
        "미니멀 타이포": "minimal graphic design, typographic poster",
        "실사풍": "photorealistic illustration, cinematic",
        "수묵화": "traditional East Asian ink wash painting, sumi-e style, monochrome brush strokes",
        "사이버펑크": "cyberpunk neon-lit illustration, futuristic dystopian style",
    }
    art_style = style_map.get(style, "webtoon comic art style")

    tone = settings.get("coverTone", "어두운")
    tone_map = {
        "어두운": "dark and dramatic mood, deep shadows",
        "밝은": "bright and vibrant mood, warm lighting",
        "파스텔": "soft pastel tones, gentle and dreamy atmosphere",
    }
    tone_desc = tone_map.get(tone, "dark and dramatic mood")

    # 텍스트 오버레이 지시
    if include_title and include_author and author_name:
        text_instruction = (
            f"Include the Korean title '{title}' as bold, prominent typography on the upper portion of the cover. "
            f"Include the author name '{author_name}' in smaller elegant text near the bottom. "
            "The text must be legible and integrated beautifully into the composition."
        )
    elif include_title:
        text_instruction = (
            f"Include the Korean title '{title}' as bold, prominent typography on the cover. "
            "The text must be legible and integrated beautifully into the composition."
        )
    elif include_author and author_name:
        text_instruction = (
            f"Include the author name '{author_name}' in small elegant text near the bottom of the cover. "
            "No other text."
        )
    else:
        text_instruction = "No title text, no author text, no watermarks, no UI elements."

    # 인물 묘사 블록
    char_block = _build_char_prompt(settings, include_char)

    # 대사/텍스트 금지 — 항상 적용
    no_dialogue = (
        "STRICT RULE: No speech bubbles, no dialogue text, no captions, no word balloons, "
        "no onomatopoeia text, no subtitles anywhere in the image. Pure visual illustration only."
    )

    prompt_parts = [
        f"Professional book cover for a Korean web novel titled '{title}'.",
        f"Genre: {genres}. Setting: {era}.",
        f"Art style: {art_style}. Mood: {tone_desc}.",
    ]
    if char_block:
        prompt_parts.append(char_block)
    prompt_parts += [
        "Vertical format (portrait orientation), dramatic composition, high quality illustration.",
        no_dialogue,
        text_instruction,
    ]
    prompt = " ".join(prompt_parts)

    count = max(1, min(int(body.get("count", 4)), 4))

    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=180.0)
    try:
        response = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1024x1536",
            quality="medium",   # 4장 배치 생성에는 medium으로 속도/비용 균형
            n=count,
        )
    except openai.APITimeoutError:
        raise HTTPException(status_code=504, detail="표지 생성 시간이 초과됐어요. 다시 시도해 주세요.")
    except openai.AuthenticationError:
        raise HTTPException(status_code=502, detail="OpenAI 인증 오류입니다. 관리자에게 문의하세요.")
    except openai.RateLimitError as e:
        msg = str(e)
        if "billing" in msg.lower() or "hard limit" in msg.lower():
            raise HTTPException(status_code=402, detail="OpenAI 크레딧이 부족해요. 관리자에게 문의하세요.")
        raise HTTPException(status_code=429, detail="요청이 너무 많아요. 잠시 후 다시 시도해 주세요.")
    except openai.BadRequestError as e:
        msg = str(e)
        if "billing" in msg.lower() or "hard limit" in msg.lower():
            raise HTTPException(status_code=402, detail="OpenAI 크레딧이 부족해요. 관리자에게 문의하세요.")
        raise HTTPException(status_code=400, detail=f"표지 생성 요청 오류: {msg[:200]}")
    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"표지 생성 실패: {str(e)[:200]}")

    cover_urls = []
    for item in response.data:
        if getattr(item, "b64_json", None):
            cover_urls.append(f"data:image/png;base64,{item.b64_json}")
        elif getattr(item, "url", None):
            cover_urls.append(item.url)

    if not cover_urls:
        raise HTTPException(status_code=502, detail="이미지 응답을 받지 못했어요")

    # 첫 번째를 기본값으로 저장 (사용자가 확정하면 선택한 것으로 덮어씀)
    db.table("novels").update({"cover_url": cover_urls[0]}).eq("id", novel_id).execute()

    return {"cover_url": cover_urls[0], "cover_urls": cover_urls}
