"""
prompts.py — 3계층 프롬프트 조립 (13 §3).

  계층1 시스템(세계관 헌법, 거의 불변)  → build_system()      [캐싱 대상]
  계층2 동적 컨텍스트(스토리 상태)       → build_context()     [회차마다 갱신]
  계층3 회차 지시(이번 회차 미션)        → build_task()        [매 호출 신규]
"""
import config


_PARA_GUIDE = {
    "short":  "문단 1개 = 1~3문장(20~60자). 짧게 끊어 속도감·긴장감을 극대화한다. 액션·반전·긴장 구간에 최적.",
    "medium": "문단 1개 = 3~5문장(60~130자). 대사·행동·묘사가 자연스럽게 교차하는 일반 웹소설 호흡.",
    "long":   "문단 1개 = 5~9문장(130~220자). 서정적 묘사·심리 탐구 중심. 각 단락이 하나의 감정·정경을 완성한다.",
}


# ── 계층1: 세계관 헌법 (거의 불변, 캐싱) ──────────────────────────────────
def build_system(novel) -> str:
    target = config.LENGTH_TARGETS.get(novel.length, 4000)
    para_guide = _PARA_GUIDE.get(getattr(novel, "paragraph_length", "medium"), _PARA_GUIDE["medium"])

    # 캐릭터 카드 — 심리 프로필 포함
    char_lines = []
    for c in novel.characters:
        line = (
            f"  - {c.name}({c.role}): 외형={c.appearance or '미지정'}, "
            f"특징={c.trait or '없음'}, 성격={c.personality or '미지정'}"
        )
        extras = []
        if getattr(c, "desire", ""):
            extras.append(f"욕망={c.desire}")
        if getattr(c, "fear", ""):
            extras.append(f"두려움={c.fear}")
        if getattr(c, "mannerism", ""):
            extras.append(f"말버릇={c.mannerism}")
        if getattr(c, "secret", ""):
            extras.append(f"[내부 복선용 비밀: {c.secret}]")
        if extras:
            line += " | " + ", ".join(extras)
        char_lines.append(line)
    chars = "\n".join(char_lines)

    rules = []
    if novel.world_rules:
        rules.append(f"- 세계관 규칙: {novel.world_rules}")
    if novel.constraints:
        rules.append(f"- 표현 제약: {novel.constraints}")
    rules_block = "\n".join(rules) if rules else "  (추가 규칙 없음)"

    # 파워 시스템 블록
    ps = getattr(novel, "power_system", {}) or {}
    power_block = ""
    if ps.get("enabled"):
        ps_lines = []
        if ps.get("rankNames"):
            ps_lines.append(f"- 등급 체계(강→약): {ps['rankNames']}")
        if ps.get("coreRule"):
            ps_lines.append(f"- 핵심 규칙: {ps['coreRule']}")
        if ps.get("protagonistRank"):
            goal_str = f" → 목표: {ps['protagonistGoal']}" if ps.get("protagonistGoal") else ""
            ps_lines.append(f"- 주인공 현재 등급: {ps['protagonistRank']}{goal_str}")
        if ps.get("limitation"):
            ps_lines.append(f"- 한계·부작용: {ps['limitation']}")
        if ps_lines:
            power_block = "\n[능력·파워 시스템]\n" + "\n".join(ps_lines)

    # 감정 목표 / 클리프행어 스타일
    emotional_goal = getattr(novel, "emotional_goal", "") or ""
    cliffhanger_style = getattr(novel, "cliffhanger_style", "") or ""
    reference_work = getattr(novel, "reference_work", "") or ""

    emotional_block = ""
    if emotional_goal or reference_work:
        emotional_block = "\n[감정 목표 & 레퍼런스]"
        if emotional_goal:
            emotional_block += f"\n- 독자가 느껴야 할 감정: {emotional_goal}"
        if reference_work:
            emotional_block += f"\n- 참고 분위기: {reference_work}"

    cliff_rule = ""
    cliff_map = {
        "반전형": "회차 끝에 예상 못한 반전(아는 인물의 배신, 숨겨진 사실 폭로)으로 마무리한다.",
        "의문형": "회차 끝에 핵심 의문('그가 왜 그랬을까?', '저 인물의 정체는?')을 남긴다.",
        "감정형": "회차 끝에 인물의 감정이 극에 달하는 장면(눈물·분노·포기 직전)으로 마무리한다.",
        "행동형": "회차 끝에 인물이 결정적 행동을 막 시작하거나 장면을 끊는다.",
    }
    if cliffhanger_style in cliff_map:
        cliff_rule = f"\n⑥ 클리프행어 스타일: {cliff_map[cliffhanger_style]}"

    # 회차 패턴
    rhythm = getattr(novel, "chapter_rhythm", {}) or {}
    rhythm_block = ""
    rhythm_parts = []
    if rhythm.get("eventEveryN"):
        rhythm_parts.append(f"매 {rhythm['eventEveryN']}화마다 큰 사건·전환점 1개 배치")
    if rhythm.get("maxOpenThreads"):
        rhythm_parts.append(f"동시 열린 복선은 {rhythm['maxOpenThreads']}개 이내로 유지")
    if rhythm.get("note"):
        rhythm_parts.append(rhythm["note"])
    if rhythm_parts:
        rhythm_block = "\n[회차 패턴]\n" + "\n".join(f"- {r}" for r in rhythm_parts)

    # 피폐물 여부
    dark_genres = {"피폐", "피폐물", "다크", "다크 로맨스", "비극"}
    is_dark = any(g.strip() in dark_genres for g in novel.genres) or \
              any(kw in (novel.style or "") for kw in ("피폐", "다크"))
    protagonist_rule = (
        "- 주인공이 일방적으로 당하기만 하는 전개는 최소화하고, 반드시 능동적인 반응이나 내면의 결의를 보여줄 것."
        if not is_dark else
        "- 피폐물 장르이므로 주인공의 고통과 무력감을 실감 나게 묘사하되, 독자가 포기하지 않을 감정적 연결고리(공감·희망·분노)를 유지할 것."
    )

    return f"""당신은 누적 조회수 1억을 돌파한 10년 차 베테랑 웹소설 작가입니다.
웹소설 독자 취향을 완벽히 이해하며, 독자가 '다음 화 결제' 버튼을 누르지 않을 수 없게 만드는
후킹·사이다 전개·감정선 설계의 전문가입니다.
아래 [작품 헌법]과 [집필 원칙]을 절대 위반하지 않습니다.

[작품 헌법]
- 제목: {novel.title}
- 배경 시대: {novel.era}
- 장르: {', '.join(novel.genres)}
- 화자 시점(POV): {novel.pov}  (절대 이탈 금지 — 시점 인물만 알 수 있는 정보만 서술)
- 문체·톤: {novel.style or '웹소설 가독형 (짧은 호흡, 대사·행동·내적 독백 균형)'}
- 주인공 목표: {novel.goal}
- 핵심 갈등: {novel.conflict}
- 결말 방향(전체가 수렴할 지점): {novel.ending}
- 연령 등급: {novel.age_rating}세 이용가  (이 수위를 넘지 않는다){emotional_block}

[등장인물 카드]  (외형·말투·성격·말버릇·내면을 회차마다 일관되게 유지)
{chars}{power_block}{rhythm_block}

[세계관·제약]
{rules_block}

[집필 원칙 — 반드시 지켜라]

① 회차 첫 3줄 — 강력한 후킹
   - 긴장·반전·의문 중 하나를 첫 3줄 안에 배치한다.
   - 독자가 스크롤을 멈추지 못하게 만드는 문장으로 시작한다.

② 보여주기(Show, Don't Tell)
   - 감정을 직접 서술하지 않는다. "슬펐다" → "그의 손끝이 미세하게 떨렸다".
   - 성격은 대사·행동으로 드러낸다. "그는 차가운 인물이다" 직접 서술 금지.
   - 인포덤프(설명을 위한 설명) 금지. 세계관·배경 정보는 반드시 사건·대화 속에 녹여낸다.

③ 대사 · 행동 · 내적 독백 = 5 : 3 : 2 비율
   - 대사가 리듬을 이끌고, 행동 묘사가 장면을 고정하고, 내적 독백이 감정을 심는다.
   - 대화 3~4행마다 감각적 묘사(냄새·소리·촉감·시각) 최소 1회 삽입.
   - 대사 뒤 "~라고 말했다" 금지 — 구체적 행동 지문으로 대체.

④ 금지 표현
   - 번역체·수동태: "~되어졌다", "~에 의해", "~인 것이다" 남발 금지.
   - 같은 단어·어미 3회 이상 연속 반복 금지 ("~했다. ~했다. ~했다." 등).
   - 감정 직접 서술: "매우 화가 났다", "엄청난 슬픔을 느꼈다" 금지.
   - 장면 전환 없는 시간 도약: "그로부터 3일이 지났다" 단독 문장 금지.
{protagonist_rule}

⑤ 장르 문법 + 한 박자 비틀기
   - 독자가 예상하는 전개를 한 박자 비틀어 신선함을 준다.
   - 단, 장르가 요구하는 카타르시스(사이다·먼치킨 등)는 적절한 타이밍에 반드시 제공한다.
{cliff_rule}
[문단 길이 — 모바일 가독성 기준]
{para_guide}

[출력 규약]
- 분량: 약 {target}자 (한국어 기준). 반드시 완성된 문장으로 끝낼 것. 잘린 채로 끝내지 않는다.
- 회차 끝은 반드시 '절단 신공(클리프행어)'으로 마무리 — 독자가 다음 화를 보지 않고는 못 배길 것.
- 본문만 출력한다. 메타 설명·머리말·꼬리말·작가노트 절대 금지.
- 회차 제목을 첫 줄에 '# 제목' 형식으로 1줄 넣고, 이어서 본문 시작."""


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

    # 복선 계획: 회수 예정 회차 이전에 심어야 할 복선 추출
    foreshadowing = getattr(novel, "foreshadowing", []) or []
    fs_block = ""
    upcoming = [f for f in foreshadowing if isinstance(f, dict) and f.get("hint") and f.get("revealChapter", 0) > seq]
    if upcoming:
        upcoming_sorted = sorted(upcoming, key=lambda f: f.get("revealChapter", 0))[:5]
        fs_lines = [f"  - {f['hint']} (→ {f['revealChapter']}화 회수 예정)" for f in upcoming_sorted]
        fs_block = "\n\n# 계획된 복선 (현재 {seq}화 이후 회수 예정 — 지금 자연스럽게 심어두기)\n".format(seq=seq) + "\n".join(fs_lines)

    return f"""[지금까지의 이야기 — 일관성 유지용]

# 전체 서사 골격(4단 구조)
{four_act_line}

# 직전 회차 요약(가까운 순)
{prev_block}

# 인물 관계 — '현재 {seq}화' 시점 상태 + 다가오는 전환
{rel_block}

# 회수해야 할 열린 복선
{threads_block}{fs_block}

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
