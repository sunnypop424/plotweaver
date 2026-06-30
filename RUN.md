# 실행 명령어

## 터미널 1 — 백엔드
```bash
cd ~/Desktop/plotweaver/backend
PYTHONPATH=~/Desktop/plotweaver python -m uvicorn main:app --reload --port 8002
```
> 최초 1회: `python -m pip install -r requirements.txt`

## 터미널 2 — 프론트엔드
```bash
cd ~/Desktop/plotweaver/web
npm run dev
```

## 접속 주소
- 프론트엔드: http://localhost:5177
- 백엔드 API: http://localhost:8002
