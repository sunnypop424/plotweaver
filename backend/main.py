"""
PlotWeaver FastAPI 서버
- /api/novels  : 작품 CRUD
- /api/generate: 회차·표지 생성 (engine_poc 래핑)
"""
import os
import sys
import io
from pathlib import Path

# Windows cp949 터미널에서 유니코드 출력 오류 방지
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# engine_poc를 임포트 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent / "engine_poc"))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import novels, generate, suggest

app = FastAPI(title="PlotWeaver API", version="0.1.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5177")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5177", "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(novels.router, prefix="/api/novels", tags=["novels"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(suggest.router)


@app.get("/health")
def health():
    return {"status": "ok"}
