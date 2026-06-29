"""
config.py — 모델·단가·분량·생성단위를 코드에서 분리한다.

  검증 순서 결정(2026-06-29, `09` §1 / `13` §0):
  AI 모델·생성 단가·분량·생성 단위를 하드코딩하지 않고 여기 config로 분리해,
  "나중에 가격·UX는 숫자만 수정" 전략이 실제로 성립하게 한다.
  ► 토큰 로깅은 첫날부터 ON. 단, 정밀 '원가 판정'은 최종 단계(09 실험5)로 이연.

환경변수로 모델을 갈아끼울 수 있다(모델 미확정 상황 대응):
  PLOTWEAVER_PROSE_MODEL  본문(고품질) 모델
  PLOTWEAVER_AUX_MODEL    요약·추출(저가) 모델
"""
import os

# --- 모델 라우팅 (13 §7) -------------------------------------------------
# 본문 = 고품질 모델 / 요약·추출 = 저가 모델. 보조 호출 원가를 낮춘다.
MODELS = {
    "prose":   os.getenv("PLOTWEAVER_PROSE_MODEL", "claude-sonnet-4-6"),
    "summary": os.getenv("PLOTWEAVER_AUX_MODEL", "claude-haiku-4-5-20251001"),
    "extract": os.getenv("PLOTWEAVER_AUX_MODEL", "claude-haiku-4-5-20251001"),
    "audit":   os.getenv("PLOTWEAVER_AUX_MODEL", "claude-haiku-4-5-20251001"),
}

# --- 분량 (02 §6) --------------------------------------------------------
# 회차당 목표 분량(자 기준). 원가가 높으면 최종 단계에서 이 숫자만 바꾼다.
LENGTH_TARGETS = {"short": 2000, "normal": 4000, "long": 6000}

# --- 컨텍스트 예산 (13 §4-3) ---------------------------------------------
# 직전 N회차 요약만 전체 주입(요약 누적). 더 먼 과거는 선택적 회상(RAG, 본 PoC 미구현).
RECENT_SUMMARY_WINDOW = 3

# --- 출력 토큰 상한 (13 §7 '분량 가드' / 과생성 방지) ---------------------
MAX_OUTPUT_TOKENS = 8000          # 본문
MAX_OUTPUT_TOKENS_AUX = 1500      # 요약·추출·감사

# --- 프롬프트 캐싱 (13 §7) -----------------------------------------------
# 계층1(세계관 헌법+인물카드)은 회차마다 동일 → 캐시로 반복 입력 토큰 절감.
ENABLE_PROMPT_CACHE = True

# --- 분량 미달 시 1회 보강(이어쓰기) (13 §5-1) ---------------------------
ENFORCE_LENGTH = True
LENGTH_TOLERANCE = 0.8            # 목표의 80% 미만이면 이어쓰기 1회
