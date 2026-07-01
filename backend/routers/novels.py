"""작품 CRUD — POST /api/novels, GET /api/novels, GET /api/novels/{id}"""
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, ConfigDict, ValidationError
from typing import Any, Optional
from auth import get_current_user
from db import get_db

router = APIRouter()


class NovelSettingsModel(BaseModel):
    """novels.settings JSON에 대한 느슨한 검증 — 알려진 필드는 대략적 타입만 확인하고,
    프론트엔드 전용 부가 필드(worldFactionsData/worldRegions/factionRelations 등)는
    extra="allow"로 그대로 통과시킨다. 명백한 타입 오류(예: characters가 리스트가 아님)만 걸러낸다."""
    model_config = ConfigDict(extra="allow")

    era: Optional[str] = None
    genres: Optional[list] = None
    worldRules: Optional[str] = None
    constraints: Optional[str] = None
    glossaryDict: Optional[dict] = None
    worldFactions: Optional[list] = None
    worldRanks: Optional[list] = None
    characters: Optional[list] = None
    goal: Optional[str] = None
    conflict: Optional[str] = None
    storyFlow: Optional[dict] = None
    ending: Optional[str] = None
    relationships: Optional[list] = None
    pov: Optional[str] = None
    totalChapters: Optional[int] = None
    length: Optional[str] = None
    title: Optional[str] = None
    ageRating: Optional[str] = None
    tone: Optional[str] = None
    coverStyle: Optional[str] = None
    unit: Optional[str] = None


class NovelCreate(BaseModel):
    title: str
    settings: NovelSettingsModel


@router.post("/")
def create_novel(body: NovelCreate, user=Depends(get_current_user)):
    db = get_db()
    result = db.table("novels").insert({
        "author_id": str(user.id),
        "title": body.title,
        "settings": body.settings.model_dump(exclude_none=True),
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="작품 생성 실패")
    novel = result.data[0]
    db.table("story_bibles").insert({
        "novel_id": novel["id"],
        "data": {"summaries": [], "open_threads": [], "glossary": {}},
    }).execute()
    return novel


@router.get("/")
def list_novels(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("novels").select("id, title, status, created_at, cover_url, settings").eq(
        "author_id", str(user.id)
    ).order("created_at", desc=True).execute()
    novels = result.data or []

    # 챕터 수 일괄 조회 (N+1 방지)
    novel_ids = [n["id"] for n in novels]
    chapter_counts: dict[str, int] = {}
    if novel_ids:
        chapters_result = db.table("chapters").select("novel_id, seq").in_("novel_id", novel_ids).execute()
        for row in (chapters_result.data or []):
            chapter_counts[row["novel_id"]] = chapter_counts.get(row["novel_id"], 0) + 1

    return [{
        "id": n["id"],
        "title": n["title"],
        "status": n["status"],
        "created_at": n["created_at"],
        "cover_url": n["cover_url"],
        "done_chapters": chapter_counts.get(n["id"], 0),
        "total_chapters": (n.get("settings") or {}).get("totalChapters", 1),
    } for n in novels]


@router.get("/{novel_id}")
def get_novel(novel_id: str, user=Depends(get_current_user)):
    db = get_db()
    result = db.table("novels").select("*").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    return result.data


@router.patch("/{novel_id}")
def update_novel(novel_id: str, body: dict = Body(...), user=Depends(get_current_user)):
    db = get_db()
    novel = db.table("novels").select("id").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    allowed = {k: body[k] for k in ("status", "title", "settings", "cover_url") if k in body}
    if not allowed:
        raise HTTPException(status_code=400, detail="업데이트할 항목이 없습니다")
    if "settings" in allowed:
        try:
            allowed["settings"] = NovelSettingsModel.model_validate(allowed["settings"]).model_dump(exclude_none=True)
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=f"설정 형식이 올바르지 않습니다: {str(e)[:300]}")
    try:
        result = db.table("novels").update(allowed).eq("id", novel_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"작품 수정에 실패했어요: {str(e)[:200]}")
    return result.data[0] if result.data else {}


@router.delete("/{novel_id}")
def delete_novel(novel_id: str, user=Depends(get_current_user)):
    db = get_db()
    novel = db.table("novels").select("id").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    db.table("chapters").delete().eq("novel_id", novel_id).execute()
    db.table("story_bibles").delete().eq("novel_id", novel_id).execute()
    db.table("novels").delete().eq("id", novel_id).execute()
    return {"deleted": True}


@router.get("/{novel_id}/chapters")
def list_chapters(novel_id: str, user=Depends(get_current_user)):
    db = get_db()
    novel = db.table("novels").select("id").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    result = db.table("chapters").select("seq, content, created_at").eq(
        "novel_id", novel_id
    ).order("seq").execute()
    return result.data or []


@router.get("/{novel_id}/chapters/{seq}")
def get_chapter(novel_id: str, seq: int, user=Depends(get_current_user)):
    db = get_db()
    novel = db.table("novels").select("id").eq("id", novel_id).eq(
        "author_id", str(user.id)
    ).single().execute()
    if not novel.data:
        raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다")
    chapter = db.table("chapters").select("*").eq("novel_id", novel_id).eq(
        "seq", seq
    ).single().execute()
    if not chapter.data:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다")
    return chapter.data
