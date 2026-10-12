# ADR-0002: 도메인 엔티티와 Mongoose 스키마 분리

## 상태

Proposed — 2026-10-11

## 맥락

- clever-lab-api 엔티티는 `@Schema`, `@Prop`이 붙은 Mongoose 클래스다.
- 컬렉션마다 시간 저장 타입이 다르다. `clkLabs`, `clkLabOrders`, `clkManagers`는 unix 초(number), `clkBills`, `clkInvoices`, `clkSubLabs`는 Date다.
- ewoosoft `/es-arch`는 `domain`에 프레임워크 데코레이터를 금지한다.

## 결정

- `domain` 엔티티는 순수 TypeScript 클래스로 둔다. Mongoose 스키마는 `infrastructure/*.schema.ts`에 둔다.
- `infrastructure/*.mapper.ts`가 Document와 도메인 엔티티를 변환하고, 시간 값을 `Date`로 통일한다.
- 도메인 엔티티에는 어드민이 쓰는 필드만 둔다. 원본 문서 보기는 리포지토리의 `findRawById`가 도메인을 거치지 않고 plain object로 반환한다.

## 결과

- `domain` 이상 계층은 저장 타입 차이를 모른다.
- 매핑 코드가 컬렉션마다 하나씩 생긴다.

근거: `docs/specs/spec-backend.md` 3.6, 3.8
