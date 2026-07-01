# 실행 명령어

## 터미널 1 — 백엔드
```bash
cd ~/Desktop/plotweaver/backend
PYTHONPATH=~/Desktop/plotweaver python -m uvicorn main:app --reload --reload-dir . --reload-dir ../engine_poc --port 8002
```
> 최초 1회: `python -m pip install -r requirements.txt`
> `--reload`는 기본적으로 실행 디렉터리(`backend/`)만 감시한다. `backend`가 import하는 `engine_poc/`는 형제 디렉터리라 감시 대상이 아니므로, `engine_poc/*.py`를 고쳐도 자동 반영되지 않는다. `--reload-dir`로 두 디렉터리를 모두 지정해야 한다(한 번 지정하면 목록이 기본값을 대체하므로 `.`도 함께 명시).

## 터미널 2 — 프론트엔드
```bash
cd ~/Desktop/plotweaver/web
npm run dev
```

## 접속 주소
- 프론트엔드: http://localhost:5177
- 백엔드 API: http://localhost:8002
