"""
consistency.py — 30화 일관성 감사 (09 실험2 / 13 §9 #1).

  실험2의 핵심 질문 "30화까지 캐릭터·관계가 안 무너지나?"를 자동 점검한다.
  요약(chapter_summaries)만 입력하므로 저렴하다(전체 본문 재투입 X).
"""
import json
import re

import llm


def _char_card_block(novel):
    return "\n".join(
        f"- {c.name}({c.role}): 외형={c.appearance}, 특징={c.trait}, 성격={c.personality}"
        for c in novel.characters
    )


def _relation_block(novel):
    out = []
    for r in novel.relationships:
        tl = " → ".join(f"{s.stage}:{s.label}" for s in r.timeline)
        out.append(f"- {r.from_char}-{r.to_char}: {tl}")
    return "\n".join(out)


def audit(novel, bible):
    """전 회차 요약을 인물카드·관계설정과 대조해 일관성 위반을 찾는다."""
    summaries = "\n".join(f"[{s.seq}화] {s.summary_short}" for s in bible.summaries)
    prompt = f"""아래 웹소설의 '설정'과 '회차별 요약'을 대조해, 설정을 위반한 부분을 찾아라.
점검 항목: ①인물 성격·외형·이름의 모순 ②관계 설정/타임라인과 어긋난 전개
③죽은 인물 재등장 등 상태 모순 ④설정된 세계관 규칙 위반.

반드시 아래 JSON 하나만 출력(코드펜스 금지):
{{
  "violations": [
    {{"seq": 회차번호, "type": "character|relationship|state|world", "desc": "위반 내용 한 줄"}}
  ]
}}

[인물 카드]
{_char_card_block(novel)}

[관계 설정(타임라인)]
{_relation_block(novel)}

[회차별 요약]
{summaries}"""
    raw = llm.generate("audit", "너는 꼼꼼한 연속성 감수자다.", prompt, label="audit")
    data = _parse(raw)
    return data.get("violations", [])


def report(novel, bible, violations):
    total = len(bible.summaries)
    rate = (len(violations) / total) if total else 0
    lines = [
        f"# 일관성 감사 리포트 — {novel.title}",
        "",
        f"- 생성 회차: **{total}화**",
        f"- 발견된 위반: **{len(violations)}건**",
        f"- 회차당 위반율: **{rate:.0%}**  (실험2 게이트: 붕괴율 ≤ 20%)",
        f"- 판정: {'✅ 통과' if rate <= 0.20 else '❌ 미달 — 엔진/관계도 보강 필요'}",
        "",
        "## 위반 상세",
    ]
    if violations:
        for v in violations:
            lines.append(f"- [{v.get('seq','?')}화/{v.get('type','?')}] {v.get('desc','')}")
    else:
        lines.append("- (위반 없음)")
    return "\n".join(lines), rate


def _parse(raw):
    m = re.search(r"\{.*\}", raw.strip(), re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {"violations": []}
