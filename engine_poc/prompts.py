"""
prompts.py — 3계층 프롬프트 조립 (13 §3).

  계층1 시스템(세계관 헌법, 거의 불변)  → build_system()      [캐싱 대상]
  계층2 동적 컨텍스트(스토리 상태)       → build_context()     [회차마다 갱신]
  계층3 회차 지시(이번 회차 미션)        → build_task()        [매 호출 신규]
"""
import config


# ── 계층1: 세계관 헌법 (거의 불변, 캐싱) ──────────────────────────────────
def build_system(novel) -> str:
    target = config.LENGTH_TARGETS.get(novel.length, 4000)
    chars = "\n".join(
        f"  - {c.name}({c.role}): 외형={c.appearance or '미지정'}, "
        f"특징={c.trait or '없음'}, 성격={c.personality or '미지정'}"
        for c in novel.characters
    )
    rules = []
    if novel.world_rules:
        rules.append(f"- 세계관 규칙: {novel.world_rules}")
    if novel.constraints:
        rules.append(f"- 표현 제약: {novel.constraints}")
    rules_block = "\n".join(rules) if rules else "  (추가 규칙 없음)"

    return f"""너는 한국 웹소설 전문 작가다. 아래 '작품 헌법'을 절대 위반하지 않는다.
설정과 모순되는 전개·묘사·이름·관계를 만들지 않는다.

[작품 헌법]
- 제목: {novel.title}
- 배경 시대: {novel.era}
- 장르: {', '.join(novel.genres)}
- 화자 시점(POV): {novel.pov}  (이 시점을 끝까지 유지)
- 문체·톤: {novel.style or '웹소설 가독형(짧은 호흡, 대사 비중 적절)'}
- 주인공 목표: {novel.goal}
- 핵심 갈등: {novel.conflict}
- 결말 방향(전체가 수렴할 지점): {novel.ending}
- 연령 등급: {novel.age_rating}세 이용가  (이 수위를 넘지 않는다)

[등장인물 카드]  (외형·말투·성격을 회차마다 일관되게 유지)
{chars}

[세계관·제약]
{rules_block}

[출력 규약]
- 분량: 약 {target}자 (한국어 기준). 과부족 없이 한 회차 분량으로.
- 웹소설 호흡: 문단을 짧게, 대사와 묘사를 교차.
- 회차 끝은 다음 화를 보고 싶게 만드는 '훅(클리프행어)'으로 마무리.
- 본문만 출력한다. 메타 설명·머리말·꼬리말·작가노트 금지.
- 회차 제목을 첫 줄에 '# 제목' 형식으로 1줄 넣고, 이어서 본문."""


# ── 계층2: 동적 컨텍스트 (회차마다 갱신) ─────────────────────────────────
def build_context(novel, seq, four_act_line, relation_lines, recent_summaries, open_threads, glossary) -> str:
    rel_block = "\n".join(f"  - {r}" for r in relation_lines) if relation_lines else "  (관계 정보 없음)"

    if recent_summaries:
        prev_block = "\n".join(
            f"  [{s.seq}화] {s.summary_short}" for s in recent_summaries
        )
    else:
        prev_block = "  (아직 이전 회차 없음 — 이번이 1화)"

    threads_block = "\n".join(f"  - {t}" for t in open_threads) if open_threads else "  (없음)"
    glossary_block = ", ".join(f"{k}={v}" for k, v in glossary.items()) if glossary else "(없음)"

    return f"""[지금까지의 이야기 — 일관성 유지용]

# 전체 서사 골격(4단 구조)
{four_act_line}

# 직전 회차 요약(가까운 순)
{prev_block}

# 인물 관계 — '현재 {seq}화' 시점 상태 + 다가오는 전환
{rel_block}

# 회수해야 할 열린 복선
{threads_block}

# 고유명사 표기(통일)
  {glossary_block}"""


# ── 계층3: 이번 회차 지시 (매 호출 신규) ─────────────────────────────────
def build_task(novel, seq, stage, last_scene, user_note="") -> str:
    flow = novel.story_flow.get(stage, "")
    last_block = f"\n[직전 회차 마지막 장면 — 자연스럽게 이어서 시작]\n{last_scene}\n" if last_scene else ""
    note_block = f"\n[작가 추가 지시]\n{user_note}\n" if user_note else ""
    return f"""[이번 회차 미션]
- 회차 번호: {seq}화 / 총 {novel.total_chapters}화
- 현재 서사 단계: '{stage}'  ({flow})
- 위 '현재 관계 상태'와 '다가오는 전환'을 반영해, 전환이 갑자기가 아니라
  자연스럽게 빌드업되도록 복선·감정선을 깐다.
- 열린 복선 중 적절한 것을 회수하거나 진전시킨다.
{last_block}{note_block}
이제 {seq}화 본문을 써라."""


# ── 요약·상태 추출 (write-back, 13 §4-2) ────────────────────────────────
def build_extract_prompt(seq, chapter_text) -> str:
    return f"""다음은 어느 웹소설의 {seq}화 본문이다. 다음 회차 집필을 위한 메모를 만들어라.
반드시 아래 JSON 형식 '하나만' 출력한다(설명·코드펜스 금지).

{{
  "summary_short": "이 회차 내용을 2~3문장으로 압축",
  "state_delta": ["이 회차에서 바뀐 상태(관계 변화/사망/획득/장소 이동 등) 짧게", "..."],
  "open_threads": ["아직 회수되지 않은 복선·떡밥", "..."]
}}

[본문]
{chapter_text}"""
