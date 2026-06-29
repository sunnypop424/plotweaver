"""
run.py — PoC 실행 진입점 (09 실험2 / 13 §8·§9).

사용 예:
  python run.py --dry-run                     # API 호출 없이 1화 프롬프트만 출력(무료)
  python run.py --novel samples/sample_novel.json --chapters 5
  python run.py --novel samples/sample_novel.json --chapters 30 --check

산출물(output/<제목>/):
  chapter_01.md ...      회차 본문
  summaries.json         회차별 요약·상태(스토리 바이블)
  consistency_report.md  일관성 감사(--check)
  token_log.jsonl        토큰 로깅(원가 판정은 최종 단계, 09 §1)
"""
import argparse
import json
import pathlib
import sys

# Windows 콘솔(cp949)에서도 한글·em-dash 출력이 깨지지 않도록 UTF-8 강제.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

import engine
from models import StoryBible, load_novel

OUT = pathlib.Path(__file__).parent / "output"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--novel", default="samples/sample_novel.json")
    ap.add_argument("--chapters", type=int, default=None, help="생성할 회차 수(기본: 설정의 total)")
    ap.add_argument("--dry-run", action="store_true", help="API 미호출 — 1화 프롬프트만 출력")
    ap.add_argument("--check", action="store_true", help="생성 후 일관성 감사 실행")
    args = ap.parse_args()

    path = pathlib.Path(args.novel)
    if not path.is_absolute():
        path = pathlib.Path(__file__).parent / path
    novel = load_novel(path)
    n = args.chapters or novel.total_chapters

    if args.dry_run:
        _dry_run(novel)
        return

    out_dir = OUT / _safe(novel.title)
    out_dir.mkdir(parents=True, exist_ok=True)
    bible = StoryBible()

    print(f"[엔진 PoC] '{novel.title}' — {n}화 생성 시작 "
          f"(prose={engine.config.MODELS['prose']}, aux={engine.config.MODELS['summary']})")
    for seq in range(1, n + 1):
        stage = engine.stage_of(seq, novel.total_chapters)
        text, summary = engine.generate_chapter(novel, seq, bible)
        (out_dir / f"chapter_{seq:02d}.md").write_text(text, encoding="utf-8")
        print(f"  ✓ {seq:>2}화 [{stage}] {len(text):>5}자 — {summary.summary_short[:40]}…")

    (out_dir / "summaries.json").write_text(
        json.dumps([_summary_dict(s) for s in bible.summaries], ensure_ascii=False, indent=2),
        encoding="utf-8")

    if args.check:
        import consistency
        violations = consistency.audit(novel, bible)
        rep, rate = consistency.report(novel, bible, violations)
        (out_dir / "consistency_report.md").write_text(rep, encoding="utf-8")
        print("\n" + rep)

    _print_tokens()
    print(f"\n산출물: {out_dir}")


def _dry_run(novel):
    """API 없이 프롬프트 조립만 확인(1화 + 전환이 보이는 중간 회차)."""
    bible = StoryBible()
    for seq in (1, max(2, int(novel.total_chapters * 0.6))):
        system, user = engine.assemble(novel, seq, bible)
        print("=" * 70)
        print(f"[{seq}화] 조립 프롬프트  (관계 전환 빌드업 확인용)")
        print("=" * 70)
        print("\n--- 계층1 SYSTEM (세계관 헌법, 캐싱) ---\n")
        print(system)
        print("\n--- 계층2+3 USER (컨텍스트+회차지시) ---\n")
        print(user)
        print()


def _print_tokens():
    import llm
    agg = llm.token_summary()
    if not agg:
        return
    print("\n[토큰 로깅 — 추세 감시용, 원가 판정 아님(09 §1)]")
    for role, a in agg.items():
        print(f"  {role:8} calls={a['calls']:>3}  in={a['in']:>8}  out={a['out']:>8}  cache_read={a['cache_read']:>8}")


def _summary_dict(s):
    return {"seq": s.seq, "summary_short": s.summary_short,
            "state_delta": s.state_delta, "open_threads": s.open_threads}


def _safe(name):
    # str.isalnum()은 한글도 True. 공백/underscore/dash만 추가 허용.
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip() or "novel"


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
