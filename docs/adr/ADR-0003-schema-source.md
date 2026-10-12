# ADR-0003: clever-lab-api 스키마를 가져오는 방식

## 상태

Proposed — 2026-10-11 (결정 필요)

## 맥락

어드민은 clever-lab-api와 같은 컬렉션을 읽고 일부 필드를 수정한다. 원본 스키마는 `~/vatech/project/clever-lab-api/libs/entities/src`에 있다.

## 선택지

| 방법 | 장점 | 단점 |
| --- | --- | --- |
| A. 원본 스키마 패키지 참조 | 스키마 변경이 자동 반영된다 | clever-lab-api 배포와 버전이 묶인다. GraphQL 등 불필요한 의존성이 따라온다 |
| B. 필요한 필드만 복사 + `strict: false` (추천) | 의존성이 없다. 모르는 필드를 덮어쓰지 않는다 | 원본 필드명이 바뀌면 수동으로 따라가야 한다 |

B를 고르면 수정은 바뀐 필드만 `$set`으로 쓴다 (ADR-0004).

근거: `docs/specs/spec-backend.md` 3.7, `docs/prd.md` 8장
