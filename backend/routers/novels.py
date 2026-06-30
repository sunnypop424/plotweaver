"""작품 CRUD — POST /api/novels, GET /api/novels, GET /api/novels/{id}"""
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Any
from auth import get_current_user
from db import get_db

router = APIRouter()


class NovelCreate(BaseModel):
    title: str
    settings: dict[str, Any]


@router.post("/")
def create_novel(body: NovelCreate, user=Depends(get_current_user)):
    db = get_db()
    result = db.table("novels").insert({
        "author_id": str(user.id),
        "title": body.title,
        "settings": body.settings,
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
    result = db.table("novels").update(allowed).eq("id", novel_id).execute()
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
