"""JWT 토큰 검증 → 현재 유저 반환"""
from fastapi import Header, HTTPException, status
from db import get_db


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다")
    token = authorization[7:]
    try:
        db = get_db()
        resp = db.auth.get_user(token)
        if not resp or not resp.user:
            raise ValueError("invalid")
        return resp.user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰이 유효하지 않습니다")
