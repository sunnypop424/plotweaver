# 실행 명령어

## 터미널 1 — 백엔드
```bash
cd ~/Desktop/creator/backend
PYTHONPATH=~/Desktop/creator python -m uvicorn main:app --reload --port 8002
```

## 터미널 2 — 프론트엔드
```bash
cd ~/Desktop/creator/web
npm run dev
```

## 접속 주소
- 프론트엔드: http://localhost:5177
- 백엔드 API: http://localhost:8002
