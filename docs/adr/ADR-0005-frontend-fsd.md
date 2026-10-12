# ADR-0005: 프론트엔드 FSD 레이어와 UI 라이브러리

## 상태

Proposed — 2026-10-11

## 결정

- Feature-Sliced Design 레이어 `app > pages > widgets > features > entities > shared`를 쓴다. 하위 레이어는 상위 레이어를 import하지 않고, 같은 레이어의 다른 slice도 import하지 않는다.
- UI는 Ant Design(antd 6)만 쓴다. react-admin, refine 같은 CRUD 프레임워크는 쓰지 않는다.
- 강제: `eslint.config.mjs`의 FSD 블록, `.dependency-cruiser.cjs`의 `fsd-*` 규칙.

## 결과

- 화면 수(10여 개)가 많지 않아 프레임워크 없이 antd + TanStack Query로 충분하다.
- 목록·상세·수정의 반복 코드는 직접 작성한다.

근거: `docs/specs/spec-frontend.md` 3장
