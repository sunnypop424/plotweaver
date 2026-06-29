# DB 스키마 & API 명세

> `11_기능명세서.md`의 기능(F-xx)을 데이터 모델·엔드포인트로 구체화한 개발 착수용 기술 명세.
> 전제: RDB(PostgreSQL 가정) + 객체 스토리지(표지/이미지) + 비동기 잡 큐(생성).
> 표기: PK=기본키, FK=외래키, UQ=유니크. 시각은 UTC `timestamptz`.
> 작성: 수석 PM / 최종수정: 2026-06-29
> 변경이력: 2026-06-29 — `13_AI생성엔진_설계`의 일관성 엔진 상태 테이블(`story_bible`·`chapter_summaries`·`character_state`)과 `20_창작기여증명_및_편집게이트`의 기여 증명 테이블(`chapter_revisions`·`authorship_events`·`contribution_scores`) 및 관련 API를 반영.

---

# Part 1. DB 스키마

## 1-1. ERD 개요 (관계 요약)

```
users 1───* novels 1───* chapters 1──* chapter_revisions
  │            │              ├──* authorship_events
  │            │              ├──1 contribution_scores
  │            │              └──1 chapter_summaries
  │            ├──* characters 1──* relationships(from/to)
  │            │        └──* character_state
  │            ├──1 covers
  │            ├──1 novel_settings
  │            └──1 story_bible
  │
users 1──* subscriptions
users 1──1 wallets 1──* wallet_transactions
users 1──* purchases ──* (chapters/novels)
users 1──* donations ──> novels
users(creator) 1──* payouts
novels/chapters 1──* reports ──* moderation_logs
users 1──* age_verifications
```

> 🧩 **엔진/기여 테이블**: `story_bible`·`chapter_summaries`·`character_state`는 **일관성 엔진**(`13`)이 회차마다 갱신하는 누적 상태이며, `chapter_revisions`·`authorship_events`·`contribution_scores`는 **창작 기여 증명**(`20`)을 위한 편집 이력·증거다. 대부분 **엔진/서버 내부 관리** 테이블로, 공개 API 노출은 제한적(§2-7).

---

## 1-2. 테이블 정의

### users — 회원
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| email | varchar | UQ | |
| auth_provider | enum | | kakao/google/apple/email |
| nickname | varchar | | |
| birth_date | date | | 연령 한도·등급 판정 |
| is_adult_verified | bool | default false | 성인 인증 결과(F-04) |
| role | enum | default 'user' | user/creator/admin |
| guardian_consent | bool | default false | 만14세 미만 동의(F-03) |
| status | enum | | active/suspended/banned |
| created_at | timestamptz | | |

### terms_agreements — 약관 동의 이력 (F-02)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| user_id | uuid | FK→users | |
| terms_type | enum | | service/privacy/market/marketing |
| version | varchar | | 약관 버전 |
| agreed | bool | | |
| agreed_at | timestamptz | | |

### age_verifications — 성인 인증 (F-04)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| user_id | uuid | FK→users | |
| method | enum | | pass/ipin/card |
| result | bool | | 성인 여부(결과만 저장) |
| verified_at | timestamptz | | |

### novels — 작품
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| author_id | uuid | FK→users | |
| title | varchar | | (F-10, AI자동 가능) |
| status | enum | | draft/private/public_free/for_sale |
| age_rating | enum | | all/15/19 (필수, F-04 연동) |
| visibility | enum | | private/free/paid |
| price_bundle | int | nullable | 묶음가(원) |
| price_per_chapter | int | nullable | 회차 단건가 |
| preview_chapters | int | default 2 | 무료 미리보기 화수 |
| moderation_status | enum | | pending/approved/blocked |
| created_at | timestamptz | | |

### novel_settings — 생성 설정 (필수+선택, `02`·`03`)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| novel_id | uuid PK FK→novels | 1:1 |
| era | jsonb | 배경시대 {type,value,detail} |
| genres | jsonb | 장르 배열 |
| goal | jsonb | 주인공 목표·동기 |
| conflict | jsonb | 핵심 갈등 |
| story_flow | jsonb | 기승전결 흐름 |
| ending | jsonb | 결말 방향 |
| pov | enum | 화자 시점 |
| total_chapters | int | 총 회차 수 |
| length_per_chapter | enum | short/normal/long |
| optional | jsonb | 문체·세계관·키워드·제약 등 선택정보 |

> 💡 설정을 jsonb로 둬 스키마 변경 없이 항목 추가 유연성 확보(`02` 필수 항목 확장 대응).

### characters — 등장인물 (F-11)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| novel_id | uuid FK→novels | |
| name | varchar | |
| appearance | jsonb | 외형(select/custom) |
| trait | jsonb | 신체적 특징 |
| personality | jsonb | 성격 |
| role | enum | protagonist/supporting/antagonist/helper |

### relationships — 인물 관계 + 변화 타임라인 (F-11)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| novel_id | uuid FK→novels | |
| from_character_id | uuid FK→characters | |
| to_character_id | uuid FK→characters | |
| direction | enum | one_way/two_way |
| timeline | jsonb | `[{stage,label}]` 단계별 관계 변화 |

### chapters — 회차 (F-12)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| novel_id | uuid | FK→novels | |
| seq | int | UQ(novel_id,seq) | 회차 순번 |
| title | varchar | | |
| content | text | | 본문 |
| status | enum | | generating/done/failed |
| is_preview | bool | | 무료 미리보기 여부 |
| gen_cost | numeric | | 생성 원가(토큰·비용 로깅, F-12 AC) |
| gen_model | varchar | | 사용 모델(config값 기록) |
| created_at | timestamptz | | |

### story_bible — 작품 누적 상태 (일관성 엔진, `13` §2)
> 원본 설정(불변, `novel_settings`)과 분리된 **'살아있는 설정'**. 회차가 진행되며 갱신.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| novel_id | uuid PK FK→novels | 1:1 |
| synopsis_4act | jsonb | 4단 구조(발단/전개/위기/절정·결말) — 회차 분배 기준선 |
| beat_sheet | jsonb | 회차→비트 매핑(예: 12화=관계전환) |
| world_rules | jsonb | 누적 세계관 규칙(마법체계 등, `03`) |
| glossary | jsonb | 고유명사 사전(지명·조직·아이템) — 표기 흔들림 방지 |
| open_threads | jsonb | 작품 전역의 미회수 복선 목록 |
| updated_at | timestamptz | 마지막 갱신(회차 생성 직후 write-back) |

### chapter_summaries — 회차 요약·상태 (일관성 엔진, `13` §2)
> 다음 회차 컨텍스트용 **압축본**. 전체 본문 재주입 대신 요약 누적 → 일관성+원가 동시 관리.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| chapter_id | uuid FK→chapters UQ | 1:1 |
| seq | int | 회차 번호 |
| summary_short | text | 2~3문장 압축 요약 |
| state_delta | jsonb | 이 회차에서 바뀐 상태(관계/위치/사망/획득 등) |
| open_threads | jsonb | 이 회차 기준 미회수 복선 |
| created_at | timestamptz | |

### character_state — 인물 상태 스냅샷 (일관성 엔진, `13` §2, 선택적)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| character_id | uuid FK→characters | |
| as_of_seq | int | 몇 회차 기준 상태인지 |
| status | jsonb | 생존/부상/각성 등 변화 속성 |
| updated_at | timestamptz | |

> UQ(character_id, as_of_seq) — 회차별 1스냅샷.

### chapter_revisions — 회차 편집 이력 (창작 기여 증명, `20` §5)
> AI 초안(v0)부터 최종(vN)까지 스냅샷. **편집 전/후 = 창작 기여의 증거.**

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| chapter_id | uuid FK→chapters | |
| rev_no | int | 0=AI 초안, 1..N=편집 |
| source | enum | ai_draft / user_edit / regenerate |
| content | text | 해당 버전 본문(또는 diff 저장) |
| char_count | int | 분량 |
| created_by | uuid FK→users | nullable(ai_draft는 시스템) |
| created_at | timestamptz | |

> UQ(chapter_id, rev_no). `13` 엔진은 본문 생성 시 **v0(ai_draft)을 자동 기록** → 편집 측정 기준선.

### authorship_events — 창작 행위 로그 (창작 기여 증명, `20` §5, **append-only**)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| chapter_id | uuid FK→chapters | |
| user_id | uuid FK→users | |
| event_type | enum | generated / edit / manual_block / candidate_select / structural_edit / regenerate |
| char_delta | int | 의미있는 변경·증감 글자수(사소변경 가중 0, `20` §3-1) |
| meta | jsonb | 편집구간·선택후보 등 상세 |
| created_at | timestamptz | |

> **수정·삭제 불가(append-only)** — 위변조 방지(`20` §5-3). 기여도는 이 로그로부터 **서버가 재계산**.

### contribution_scores — 기여도 점수·등급 (창작 기여 증명, `20` §3)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| chapter_id | uuid PK FK→chapters | 1:1(회차 단위) |
| edit_ratio | numeric | AI초안 대비 사람 변경·추가 비율 |
| human_blocks | int | 사람이 처음부터 쓴 문단 수 |
| revision_count | int | 실질 변경 저장 횟수(사소변경 제외) |
| structural_edits | int | 관계도·비트·인물카드 등 구조 편집 수 |
| candidate_selections | int | 복수 후보 중 선택 횟수 |
| score | numeric | 0~100 가중합 |
| tier | enum | ai_generated / ai_assisted / user_led |
| computed_at | timestamptz | 서버 재계산 시각 |

> `tier`가 **유료 판매 게이트(§2-4·`20` §4)** 와 **AI 라벨(`19` §5)** 을 동시에 결정.

### covers — 표지 (F-14)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| novel_id | uuid FK→novels | |
| image_url | varchar | 객체스토리지 경로 |
| style | jsonb | 스타일·색감·옵션 |
| is_watermarked | bool | Free 등급 워터마크 |
| selected | bool | 확정 표지 여부 |

### generation_jobs — 비동기 생성 잡 (F-12/14)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK | |
| type | enum | chapter/cover |
| target_id | uuid | novel/chapter id |
| status | enum | queued/running/done/failed |
| progress | int | 0~100 |
| error | text | nullable |

### subscriptions — 구독 (F-30)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK | |
| plan | enum | free/basic/pro |
| status | enum | active/canceled/expired |
| current_period_end | timestamptz | 갱신일 |
| pg_billing_key | varchar | 정기결제 키 |

### wallets / wallet_transactions — 크레딧·잉크 (F-30)
**wallets**: `user_id PK FK`, `credit_balance int`, `ink_balance int`, `updated_at`
**wallet_transactions**:
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK | |
| asset | enum | credit/ink |
| amount | int | +충전/−사용 |
| reason | enum | charge/generate_chapter/generate_cover/purchase/donate/refund |
| ref_id | uuid | 연관 잡/구매/후원 id |
| balance_after | int | 거래 후 잔액 |
| created_at | timestamptz | |

### purchases — 콘텐츠 구매 (F-22)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | uuid PK | | |
| buyer_id | uuid FK→users | | |
| novel_id | uuid FK→novels | | |
| chapter_id | uuid FK→chapters | nullable | 단건 구매 시 |
| unit | enum | | bundle/chapter |
| amount | int | | 결제액(잉크) |
| | | UQ(buyer,novel,chapter) | 중복구매 방지 |
| created_at | timestamptz | | |

### donations — 자율 후원 (F-23) ★
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| donor_id | uuid FK→users | |
| novel_id | uuid FK→novels | |
| creator_id | uuid FK→users | 정산 대상 |
| amount | int | 후원 총액 |
| fee_rate | numeric | 적용 수수료율(예 0.15) |
| platform_fee | int | 차감 수수료 |
| creator_amount | int | 창작자 정산액(amount−fee) |
| message | text | 응원 메시지 |
| created_at | timestamptz | |

### payouts — 창작자 정산/출금 (F-32)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| creator_id | uuid FK→users | |
| amount | int | 출금액 |
| source_breakdown | jsonb | {sales, donations} 내역 |
| status | enum | requested/paid/rejected |
| requested_at / paid_at | timestamptz | |

### reviews — 리뷰·평점 (F-24)
`id, novel_id FK, user_id FK, rating int(1-5), content text, created_at` / UQ(novel_id,user_id), 구매자만 작성.

### reports — 신고 (F-41)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid PK | |
| reporter_id | uuid FK | |
| target_type | enum | novel/chapter/review |
| target_id | uuid | |
| reason | enum | plagiarism/illegal/rating/hate/spam/etc |
| detail | text | |
| status | enum | received/reviewing/resolved/rejected |

### moderation_logs — 검수·제재 이력 (F-42)
`id, target_type, target_id, admin_id, action(approve/hold/hide/delete/payout_hold), sanction(warn/suspend/ban), similarity_score, reason, created_at`

---

# Part 2. API 명세 (REST)

## 2-0. 공통 규약
- Base: `/api/v1` · 인증: `Authorization: Bearer <JWT>`
- 응답 포맷: `{ "data": ..., "error": null }` / 에러: `{ "data": null, "error": {code, message} }`
- 페이징: `?page=&size=` → `{items, page, size, total}`
- 상태코드: 200/201, 400(검증), 401(미인증), 403(권한/한도), 409(중복), 422(생성실패)

---

## 2-1. 인증/약관/인증

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 소셜/이메일 로그인 | F-01 |
| POST | `/auth/signup` | 가입 | F-01 |
| POST | `/terms/agree` | 약관 동의 저장 | F-02 |
| POST | `/guardian-consent` | 법정대리인 동의 | F-03 |
| POST | `/age-verification` | 성인 인증 요청 | F-04 |
| GET | `/me` | 내 정보·인증상태·잔액 | |

**POST /age-verification**
```jsonc
// req
{ "method": "pass", "token": "<인증기관 토큰>" }
// res 200
{ "data": { "is_adult_verified": true }, "error": null }
// 미성년 → res 403 { error: { code: "AGE_RESTRICTED" } }
```

---

## 2-2. 작품·설정·인물·관계

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| POST | `/novels` | 작품 생성(초안) | F-10 |
| GET | `/novels/{id}` | 작품 상세 | |
| PATCH | `/novels/{id}/settings` | 설정 저장(필수/선택) | F-10 |
| POST | `/novels/{id}/characters` | 인물 추가 | F-11 |
| PATCH/DELETE | `/characters/{id}` | 인물 수정/삭제 | F-11 |
| POST | `/novels/{id}/relationships` | 관계 추가(타임라인 포함) | F-11 |
| GET | `/novels/{id}/relationships` | 관계도 조회 | F-11 |
| POST | `/novels/{id}/relationships/suggest` | 장르 기반 관계 자동추천 | F-11 |

**PATCH /novels/{id}/settings** — 필수 검증(`02`)
```jsonc
// req
{ "era": {"type":"select","value":"중세 유럽"},
  "genres": ["회귀","복수"],
  "goal": {"value":"복수"}, "conflict": {"value":"황실"},
  "story_flow": {...}, "ending": {"value":"복수 완성"},
  "pov": "first_person", "total_chapters": 30,
  "length_per_chapter": "normal", "title": null /* AI자동 */ }
// res 400 (필수 누락)
{ "error": { "code":"VALIDATION", "message":"필수 항목 누락",
  "fields":["conflict","pov"] } }
```

---

## 2-3. 생성 (비동기) — F-12 / F-14

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/novels/{id}/chapters/generate` | 회차 생성 잡 시작 |
| POST | `/novels/{id}/cover/generate` | 표지 생성 잡 시작 |
| GET | `/jobs/{jobId}` | 생성 진행률 폴링 |
| POST | `/chapters/{id}/regenerate` | 회차 재생성 (F-13) |
| PATCH | `/chapters/{id}` | 본문 수동 수정 (F-13) |

**POST /novels/{id}/chapters/generate**
```jsonc
// req
{ "mode": "single", "from_seq": 2, "count": 1 }
// 사전: 크레딧 잔액 확인 → 부족 시
// res 403 { error: { code:"INSUFFICIENT_CREDIT" } }
// 성공 res 202 (Accepted, 비동기)
{ "data": { "job_id":"...", "status":"queued" }, "error": null }
```
**GET /jobs/{jobId}**
```jsonc
{ "data": { "status":"running", "progress":62,
  "result": null }, "error": null }
// 완료 시 result: { "chapter_id":"...", "seq":2 }
// 실패 시 status:"failed" → 크레딧 미차감(롤백)
```
> 처리 흐름: 잡 생성 → 큐 → 워커가 설정+이전회차+관계 프롬프트 구성 → AI 호출 → `chapters` 저장(`gen_cost`,`gen_model` 기록) → 성공 시 크레딧 차감 커밋 / 실패 시 롤백.

---

## 2-4. 마켓·구매·후원

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| POST | `/novels/{id}/publish` | 공개/가격 설정·등록(→검수) | F-20 |
| GET | `/market/novels` | 탐색·검색·필터·정렬 | F-21 |
| GET | `/market/novels/{id}` | 판매페이지(미리보기 포함) | F-22 |
| POST | `/novels/{id}/purchase` | 구매(회차/묶음) | F-22 |
| POST | `/novels/{id}/donate` | **자율 후원** | F-23 |
| POST | `/novels/{id}/reviews` | 리뷰 작성(구매자) | F-24 |

**POST /novels/{id}/donate** — 후원 + 수수료 차감 ★
```jsonc
// req
{ "amount": 3000, "message": "외전 써주세요!" }
// 서버: 잉크 잔액 확인 → 수수료 계산(15%) → 트랜잭션
// res 201
{ "data": {
    "donation_id":"...",
    "amount":3000, "platform_fee":450, "creator_amount":2550,
    "reward": { "type":"preview_unlock", "chapter_seq":3 }
  }, "error": null }
// 잔액 부족 → 402 { error:{ code:"INSUFFICIENT_INK" } }
```
> 트랜잭션 원자성: `wallet(−amount)` + `donations(insert)` + `creator wallet/ledger(+creator_amount)` + 보상 지급을 **단일 트랜잭션**으로 처리.

**POST /novels/{id}/purchase**
```jsonc
{ "unit":"bundle" }   // or {"unit":"chapter","chapter_id":"..."}
// 중복구매 → 409 { error:{ code:"ALREADY_PURCHASED" } }
```

---

## 2-5. 결제·지갑·정산

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| POST | `/payments/charge` | 크레딧/잉크 충전(간편결제) | F-30 |
| POST | `/subscriptions` | 구독 시작(정기결제) | F-30 |
| DELETE | `/subscriptions/{id}` | 구독 해지 | F-30 |
| GET | `/wallet` | 잔액·거래내역 | F-30 |
| GET | `/me/payment-limit` | 미성년 한도·월 누적 | F-31 |
| GET | `/creator/dashboard` | 통합 정산(판매+후원) | F-32 |
| POST | `/creator/payouts` | 출금 신청 | F-32 |

**POST /payments/charge** — 미성년 한도 체크(F-31)
```jsonc
// req
{ "asset":"ink", "amount":5000, "method":"kakaopay" }
// 미성년 한도 초과 → 403
{ "error": { "code":"MINOR_LIMIT_EXCEEDED",
  "message":"월 한도 초과", "monthly_used":180000, "limit":200000 } }
```
**GET /creator/dashboard**
```jsonc
{ "data": {
    "period":"2026-06",
    "sales_amount":84000, "donation_amount":36000,
    "gross":150000, "platform_fee":30000, "payable":120000,
    "by_novel":[ {"novel_id":"...","views":3200,"purchases":120,"donations":18,"revenue":84000} ],
    "donor_messages":[ {"message":"외전 써주세요!","amount":3000} ]
  }, "error": null }
```

---

## 2-6. Trust & Safety

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| POST | `/reports` | 신고 접수 | F-41 |
| GET | `/me/reports` | 내 신고 내역 | F-41 |
| GET | `/admin/moderation/queue` | 검수 큐(분류·정렬) | F-42 |
| GET | `/admin/moderation/{targetId}` | 검수 상세(모더·유사도·이력) | F-42 |
| POST | `/admin/moderation/{targetId}/action` | 제재 처리 | F-42 |
| POST | `/admin/reports/{id}/resolve` | 신고 처리·통보 | F-42 |

**POST /admin/moderation/{targetId}/action** (admin 전용, role=admin)
```jsonc
{ "action":"hide", "sanction":"suspend", "reason":"표절 확인" }
// → moderation_logs insert + 대상 상태 변경 + 정산보류 + 양측 통보
```
> 자동필터(F-40)·유사도검사(F-50)·FDS(F-43)는 내부 파이프라인 → 플래그를 검수 큐(`/admin/moderation/queue`)로 합류.

---

## 2-7. 창작 기여·편집 이력 (F-16 — `20` 창작기여증명)

| Method | Endpoint | 설명 | 기능 |
| --- | --- | --- | --- |
| PATCH | `/chapters/{id}` | 본문 편집 저장 → **revision + authorship_events 기록**(확장) | F-13/F-16 |
| GET | `/chapters/{id}/contribution` | 회차 기여도·등급·판매 게이트 충족 여부 | F-16 |
| GET | `/chapters/{id}/revisions` | 편집 이력(v0 초안~vN) | F-16 |
| GET | `/novels/{id}/authorship-export` | **창작 기여 내역서** 내보내기(PDF/JSON) | F-16 |

**PATCH /chapters/{id}** — 편집 저장 시 이력·이벤트 적재(서버가 diff 계산)
```jsonc
// req
{ "content": "<편집된 본문>",
  "events": [ {"event_type":"manual_block","range":[120,640]},
              {"event_type":"edit","range":[20,55]} ] }
// 서버: chapter_revisions(append) + authorship_events(append-only)
//       → contribution_scores 서버 재계산(클라값 신뢰 X)
// res 200
{ "data": { "rev_no": 3, "contribution": { "score": 41, "tier": "ai_assisted",
   "edit_ratio": 0.34, "human_blocks": 3 } }, "error": null }
```

**GET /chapters/{id}/contribution**
```jsonc
{ "data": { "score": 41, "tier": "ai_assisted",
   "sellable": true,            // ai_assisted 이상 → 판매 가능
   "to_next_tier_pct": 0.18,    // 다음 등급까지(에디터 게이지용)
   "label": "AI 보조 (사용자 편집)" }, "error": null }
```

**POST /novels/{id}/publish** — 유료 판매 시 **기여도 게이트**(`20` §4)
```jsonc
// req { "visibility": "paid", "price_bundle": 5000, "age_rating": "15" }
// 판매 회차 중 tier=ai_generated 포함 시 → 403
{ "error": { "code": "CONTRIBUTION_REQUIRED",
   "message": "판매하려면 직접 편집이 필요합니다",
   "chapters": [ {"seq":4,"tier":"ai_generated","shortfall_pct":0.22} ] } }
// 전 회차 ai_assisted↑ + 등급·인증·F-50·라벨 통과 → 검수 큐 등록
```
> 게이트는 **유료 판매 등록 시점에만** 작동. 비공개/무료 공개/보관은 미적용(`20` §4-2).

---

## 3. 핵심 무결성·보안 규칙
- **금전 트랜잭션(충전·구매·후원·정산)은 반드시 단일 DB 트랜잭션 + 멱등키(Idempotency-Key)**로 중복결제 방지.
- 생성 실패 시 크레딧 **롤백 보장**(잡 실패 = 미차감).
- 19금 작품 접근/구매/후원 전 `is_adult_verified` 서버 검증.
- 미성년 결제는 서버에서 `birth_date` 기반 한도 재검증(클라 신뢰 금지).
- `gen_cost`/`gen_model` 로깅으로 **원가 모니터링**(`09` 신호등 점검 데이터화).
- 권한: 작품 수정/정산은 소유자, 검수/제재는 admin role만.
- **기여도(`contribution_scores`)는 `authorship_events`로부터 서버가 재계산**(클라이언트 값 신뢰 금지). `authorship_events`는 append-only(위변조 방지).
- **유료 판매 등록은 기여도 게이트(tier≥ai_assisted) 통과 필수**(`20` §4) — AI 생성물 무편집 판매로 인한 저작물성 리스크 차단(`19` §2-2).

---

### 연관 문서
- `11_기능명세서.md` — 기능 ID(F-xx) 정의
- `04`/`10` — 화면·와이어프레임 · `05` — 수수료 정책 · `06`/`07` — 정책·약관
