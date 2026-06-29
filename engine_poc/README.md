# 플롯위버 — AI 생성 엔진 PoC

`13_AI생성엔진_설계.md`를 **돌아가는 코드**로 옮긴 검증용 스캐폴드.
목적은 단 하나 — **09 실험2(H2-품질): "설정만으로 30화까지 캐릭터·관계가 안 무너지나?"** 를 직접 깨보는 것.

> 💡 **원가는 지금 신경 쓰지 않는다.** 검증 순서 결정(2026-06-29, `09` §1)에 따라
> 토큰 원가 정밀 판정은 최종 단계로 이연했다. 이 PoC는 **토큰을 로깅만** 하고(`output/token_log.jsonl`),
> 품질·일관성에만 집중한다.

## 구현된 설계 (← 13번 대응)

| 모듈 | 구현 내용 | 13번 |
| --- | --- | --- |
| `prompts.py` | 3계층 프롬프트(시스템/동적컨텍스트/회차지시) | §3 |
| `engine.py` `resolve_relationship` | **관계 타임라인 해석기** — 현재 관계 + 다가오는 전환을 주입해 빌드업 | §4-1 ★차별화 |
| `engine.py` `_writeback` | **스토리 바이블 갱신 루프** — 회차마다 요약·상태 추출해 누적 | §4-2 |
| `config.RECENT_SUMMARY_WINDOW` | 컨텍스트 예산 — 직전 N회차 요약만 주입 | §4-3 |
| `config.py` | 모델·분량·단가 **config 분리**(나중에 숫자만 수정) | §0·§7 |
| `llm.py` | provider 추상화 + 모델 라우팅(본문=고품질/요약=저가) + 토큰 로깅 + 프롬프트 캐싱 | §6·§7 |
| `consistency.py` | 30화 일관성 감사 → 붕괴율 ≤20% 게이트 판정 | §9 #1 |

## 실행

```bash
# 1) 설치
pip install -r requirements.txt

# 2) API 키 (Anthropic)
#   Windows PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."
#   bash:                export ANTHROPIC_API_KEY="sk-ant-..."

# 3) 먼저 무료로 프롬프트 조립 확인 (API 호출 없음)
python run.py --dry-run

# 4) 짧게 5화만 생성해보기
python run.py --novel samples/sample_novel.json --chapters 5

# 5) 본 실험 — 30화 생성 + 일관성 감사
python run.py --novel samples/sample_novel.json --chapters 30 --check
```

## 산출물 (`output/<제목>/`)
- `chapter_01.md …` — 회차 본문
- `summaries.json` — 회차별 요약·상태(스토리 바이블 누적 결과)
- `consistency_report.md` — 일관성 위반 목록 + **붕괴율 판정**(`--check`)
- `output/token_log.jsonl` — 호출별 토큰·모델(추세 감시용)

## 모델 바꾸기 (config 분리 — 나중에 숫자만)
```bash
# 본문을 더 고품질 모델로, 보조는 그대로
export PLOTWEAVER_PROSE_MODEL="claude-opus-4-8"
export PLOTWEAVER_AUX_MODEL="claude-haiku-4-5-20251001"
```

## 먼저 봐야 할 것 — `--dry-run`
`resolve_relationship`이 만든 **"현재 관계 + N화 뒤 전환 예정 — 지금부터 복선을 깔 것"** 문장이
계층2 컨텍스트에 실제로 들어가는지 확인하라. 이게 단순 생성기와의 차이(`13` §4-1)다.

## 다음 단계
- 30화 돌려 `consistency_report.md`의 **붕괴율**을 본다 → 실험2 게이트(≤20%).
- 미달이면: 관계 해석기 주입 강화 / 요약 품질 개선 / `RECENT_SUMMARY_WINDOW` 조정.
- 통과면: 본개발 잠금 해제(`16` M0). **원가·요약방식 검증은 모델 확정 후 최종 단계(M4').**
