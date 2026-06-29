"""
llm.py — provider 추상화 어댑터 (13 §6 "모델 교체가 쉬운 구조").

  현재 구현: Anthropic Claude. 다른 provider로 바꾸려면 generate()만 갈아끼우면 된다.
  모든 호출은 토큰·모델을 output/token_log.jsonl 에 로깅한다(13 §7 / 12 gen_cost·gen_model).
  ► 원가 '판정'은 하지 않는다. 로그만 쌓는다(원가 검증은 최종 단계, 09 §1).
"""
import json
import pathlib
import time

import config

_client = None
TOKEN_LOG = pathlib.Path(__file__).parent / "output" / "token_log.jsonl"


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic  # 지연 임포트(dry-run은 SDK 불필요)
        _client = Anthropic()            # ANTHROPIC_API_KEY 환경변수 사용
    return _client


def generate(role, system, user, *, label="", cache_system=None, max_tokens=None):
    """
    role: 'prose' | 'summary' | 'extract' | 'audit'  → config.MODELS 라우팅
    system: 계층1 시스템 프롬프트(세계관 헌법). cache_system=True면 프롬프트 캐싱.
    user:   계층2+계층3(본문) 또는 단일 지시(보조).
    반환: 모델 텍스트.
    """
    model = config.MODELS[role]
    if cache_system is None:
        cache_system = config.ENABLE_PROMPT_CACHE and role == "prose"
    if max_tokens is None:
        max_tokens = config.MAX_OUTPUT_TOKENS if role == "prose" else config.MAX_OUTPUT_TOKENS_AUX

    sys_blocks = [{"type": "text", "text": system}]
    if cache_system:
        sys_blocks[0]["cache_control"] = {"type": "ephemeral"}

    client = _get_client()
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=sys_blocks,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    _log_tokens(resp.usage, model, role, label)
    return text


def _log_tokens(usage, model, role, label):
    TOKEN_LOG.parent.mkdir(parents=True, exist_ok=True)
    rec = {
        "ts": round(time.time(), 3),
        "role": role,
        "label": label,
        "model": model,
        "input_tokens": getattr(usage, "input_tokens", 0),
        "output_tokens": getattr(usage, "output_tokens", 0),
        "cache_read": getattr(usage, "cache_read_input_tokens", 0) or 0,
        "cache_write": getattr(usage, "cache_creation_input_tokens", 0) or 0,
    }
    with TOKEN_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def token_summary():
    """누적 토큰 집계(원가 '판정' 아님 — 추세 감시용, 16 R1)."""
    if not TOKEN_LOG.exists():
        return {}
    agg = {}
    with TOKEN_LOG.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            a = agg.setdefault(r["role"], {"calls": 0, "in": 0, "out": 0, "cache_read": 0})
            a["calls"] += 1
            a["in"] += r["input_tokens"]
            a["out"] += r["output_tokens"]
            a["cache_read"] += r["cache_read"]
    return agg
