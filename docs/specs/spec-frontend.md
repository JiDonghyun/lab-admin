# Clever Lab Admin 프론트엔드 Spec

- 작성일: 2026-10-09
- 작성자: aaron.ji
- 상태: Draft (리뷰 대기)
- 관련 문서: [prd.md](../prd.md), [spec-backend.md](./spec-backend.md)
- 기준: ewoosoft `/es-arch` 표준 (`~/.claude/scripts/es-arch-check.mjs`, `~/.claude/templates/eslint/*`, `~/.claude/templates/claude-agents/adr-di-port.md`)

## 1. 아키텍처 규칙

`apps/web`은 아래 규칙을 지킨다. `/es-arch`와 CI가 자동으로 검사한다.

| 규칙 | 내용 | 심각도 |
| --- | --- | --- |
| `fsd-direction` | 하위 레이어는 상위 레이어를 import하지 않는다 (`app > pages > widgets > features > entities > shared`). | critical |
| `fsd-public-api` | 다른 slice는 `index.ts`로만 import한다. | warning |
| `adr-exists` | 주요 결정은 `docs/adr/`에 ADR로 남긴다. | warning |

## 2. 모노레포 구조

Nx(팀 표준) + pnpm workspace를 사용한다. 앱은 Nx 플러그인(`@nx/nest`, `@nx/react` + `@nx/vite`)으로 생성하고, build/serve/test/lint/typecheck 타깃은 Nx가 추론·실행·캐시한다.

```
lab-admin/
├── apps/
│   ├── api/                 # NestJS 백엔드 (tag: scope:api)
│   └── web/                 # React 프론트엔드 (tag: scope:web)
├── packages/
│   └── contracts/           # API 요청/응답 타입 (tag: scope:shared, M2에서 생성)
├── docs/
│   ├── adr/                 # 아키텍처 결정 기록
│   ├── specs/               # spec-backend.md, spec-frontend.md
│   └── prd.md
├── nx.json                  # Nx 플러그인, 타깃 기본값
├── pnpm-workspace.yaml
├── eslint.config.mjs        # 공통 TS 규칙 + Nx 프로젝트 경계(tag)
└── .dependency-cruiser.cjs  # 앱 내부 레이어 경계 (path alias 포함)
```

**실행 명령 (루트)**

| 명령 | 내용 |
| --- | --- |
| `pnpm dev` | `nx run-many -t serve`. API(3000)와 웹(4200)을 함께 띄운다. 웹의 `/api` 요청은 API로 프록시된다 |
| `pnpm build` / `test` / `lint` / `typecheck` | 모든 프로젝트에 대해 해당 Nx 타깃 실행 |
| `pnpm nx affected -t lint test build` | 변경된 프로젝트만 실행 (CI) |
| `pnpm deps:check` | dependency-cruiser 경계 검사 |

**프로젝트 경계 (Nx tag)**

| 태그 | 의존 가능 |
| --- | --- |
| `scope:api` | `scope:api`, `scope:shared` |
| `scope:web` | `scope:web`, `scope:shared` |
| `scope:shared` | `scope:shared` |

`@nx/enforce-module-boundaries`가 검사한다. 앱 안의 레이어 경계(DDD, FSD)는 각 앱의 `eslint.config.mjs`와 dependency-cruiser가 검사한다.

- `packages/contracts`에는 타입만 둔다. 런타임 코드나 검증 로직은 넣지 않는다.
- api의 DTO는 `contracts` 타입을 `implements`해서 계약이 어긋나면 컴파일 에러가 나게 한다.

## 3. 프론트엔드 구조 (apps/web)

### 3.1 기술 선택

| 항목 | 선택 | 비고 |
| --- | --- | --- |
| 빌드 | Vite 8 + React 19 + TypeScript 6.0 (`@nx/vite`) | 개발 서버 포트 4200, `/api`는 3000으로 프록시. TypeScript 7은 typescript-eslint가 아직 지원하지 않는다 |
| 라우팅 | React Router 8 | |
| 테스트 | Vitest 4 + Testing Library (jsdom, `@nx/vitest`) | |
| 서버 상태 | TanStack Query | 목록·상세 캐시, 수정 후 무효화 |
| UI 컴포넌트 | Ant Design (antd 6) | `ConfigProvider`로 한국어 locale(`koKR`), 테마 토큰 설정 |
| 폼 | antd `Form` | 입력 검증 포함. 별도 폼 라이브러리를 쓰지 않는다 |
| 날짜 | dayjs (antd 의존성) + `utc`, `timezone` 플러그인 | Asia/Seoul 기준 표시·검색 |

- CRUD 프레임워크(react-admin, refine 등)는 쓰지 않는다. antd 컴포넌트와 TanStack Query로 직접 구성한다.

**화면별 antd 컴포넌트**

| 화면 요소 | 컴포넌트 |
| --- | --- |
| 레이아웃, 사이드 메뉴 | `Layout`, `Menu` |
| 목록, 페이지네이션 | `Table` (`pagination`, `loading`, 빈 상태) |
| 기간 검색, 월 검색 | `DatePicker.RangePicker`, `DatePicker picker="month"` |
| 상세 | `Descriptions`, `Card` |
| 상태 표시 | `Tag`, `Badge` |
| 수정 | `Modal` + `Form`, 저장 전 변경 전/후 확인 |
| 알림 | `message`, `notification` (`App` 컴포넌트로 사용) |

### 3.2 FSD 레이어

```
apps/web/src/
├── app/                      # 라우터, Provider, 전역 스타일, 인증 라우트 가드
├── pages/
│   ├── login/
│   ├── lab-list/
│   ├── lab-detail/
│   ├── lab-order-list/
│   ├── lab-order-detail/
│   ├── bill-list/
│   ├── bill-detail/
│   ├── invoice-list/
│   ├── invoice-detail/
│   └── audit-log-list/
├── widgets/
│   ├── app-layout/           # 사이드 메뉴 + 헤더
│   ├── lab-table/
│   ├── lab-order-table/
│   ├── bill-table/
│   ├── invoice-table/
│   ├── audit-log-table/
│   ├── related-bills-panel/  # 의뢰서·회계 상세에서 사용
│   ├── related-lab-orders-panel/
│   ├── audit-history-panel/  # 각 상세 화면의 수정 이력
│   ├── raw-document-viewer/  # 원본 문서 JSON 보기 (antd `Drawer` + `<pre>`)
│   ├── invoice-reconciliation-panel/  # 회계 vs 명세서 합계 대조
│   └── invoice-history-table/         # 같은 기공소·거래처 월별 회계 이력
├── features/
│   ├── auth-login/
│   ├── auth-logout/
│   ├── lab-search/
│   ├── lab-edit/             # 프로필 필드만
│   ├── lab-order-search/
│   ├── lab-order-edit/       # 메모성 필드만
│   ├── bill-search/
│   ├── bill-edit/            # 메모 필드만
│   ├── invoice-search/       # 회계는 1차 조회 전용 (edit 없음)
│   └── audit-log-search/
├── entities/
│   ├── session/              # 로그인 사용자 (`GET /auth/me`). 토큰은 httpOnly 쿠키라 프론트엔드가 보관하지 않는다
│   ├── lab/                  # Sub-lab 타입·목록 UI 포함
│   ├── lab-order/
│   ├── bill/
│   ├── invoice/
│   └── audit-log/
└── shared/
    ├── api/                  # fetch 클라이언트 (`credentials: include`), 401 시 로그인 화면으로 이동
    ├── ui/                   # antd를 감싼 공용 UI (예: 마스킹 텍스트, 변경 전/후 비교 표). antd로 충분하면 만들지 않는다
    ├── lib/                  # 날짜 포맷(Asia/Seoul), 마스킹
    └── config/               # 환경 변수
```

### 3.3 레이어 책임과 import 규칙

| 레이어 | 책임 | import 가능 |
| --- | --- | --- |
| `app` | 앱 초기화, 라우팅, 인증 가드 | 전부 |
| `pages` | 라우트 단위 화면 조립 | `widgets`, `features`, `entities`, `shared` |
| `widgets` | 여러 feature·entity를 조합한 독립 블록 | `features`, `entities`, `shared` |
| `features` | 사용자 행동 하나 (검색, 수정, 로그인) | `entities`, `shared` |
| `entities` | 도메인 타입, API 호출, 조회 Query, 표시용 UI (상태 배지 등) | `shared` |
| `shared` | 도메인을 모르는 공용 코드 | 없음 |

- 같은 레이어의 다른 slice는 import하지 않는다. 예를 들어 `features/lab-edit`가 `features/lab-search`를 import하면 안 된다. 조합은 상위 레이어에서 한다.
- slice 외부에서는 `index.ts`로만 import한다 (`@/entities/bill`은 허용, `@/entities/bill/api/get-bill`은 금지).

### 3.4 Slice 내부 segment

```
entities/bill/
├── api/          # getBills, getBill, updateBill + Query 키
├── model/        # 타입 (contracts 재export), 상태 라벨 매핑
├── ui/           # BillStatusBadge, BillSummary
└── index.ts      # 공개 API
```

### 3.5 연결 문서 패널

- `widgets/related-bills-panel`은 `entities/bill`의 `useBillsByIds(ids)`를 사용한다.
- `pages/lab-order-detail`과 `pages/invoice-detail`이 같은 위젯을 쓴다.
- 의뢰서 → 명세서 → 회계 이동은 `shared/config`의 라우트 경로 상수로 링크한다.
- `widgets/audit-history-panel`은 Lab·의뢰서·명세서 상세에서 같이 쓴다.

### 3.6 공통 화면 규칙

- 목록의 검색 조건과 페이지 번호는 URL query string에 둔다. 상세에서 뒤로 가도 검색 결과가 유지된다.
- 목록은 로딩, 빈 결과, 오류 상태를 구분해서 보여준다.
- 개인정보는 목록에서 마스킹하고, 상세에서만 전체를 보여준다.

### 3.7 쓰기 UI 제한

- 삭제 버튼과 삭제 feature는 만들지 않는다 (PRD 2장).
- 수정 폼에는 PRD에서 허용한 필드만 둔다. 금액·상태·연결 필드는 상세 화면에서 읽기 전용으로 표시한다.
- 수정 전 확인 모달에 변경 전/후 값을 보여준다.

## 4. API 계약 사용 (packages/contracts)

- 요청/응답 타입은 `packages/contracts`에서 가져온다. 정의와 소유는 백엔드다 ([spec-backend.md](./spec-backend.md) 4장).
- `entities/*/model`에서 contracts 타입을 재export한다. 다른 레이어는 contracts를 직접 import하지 않고 entity의 `index.ts`를 쓴다.
- 날짜는 ISO 8601 문자열로 받고, `shared/lib`에서 Asia/Seoul 기준으로 표시한다.

## 5. 화면 흐름 예시: 의뢰서 상세

```
pages/lab-order-detail
 ├─ entities/lab-order  useLabOrder(id)          GET /lab-orders/:id
 └─ widgets/related-bills-panel
      └─ entities/bill  useBillsByIds(billIds)   (상세 응답에 포함되면 생략)
```

## 6. ADR 목록

| 번호 | 제목 | 상태 |
| --- | --- | --- |
| ADR-0005 | 프론트엔드 FSD 레이어와 slice 구성 | Proposed |

ADR-0001~0004는 백엔드 결정이다 ([spec-backend.md](./spec-backend.md) 6장).

## 7. 규칙 강제 방법

| 도구 | 설정 | 근거 |
| --- | --- | --- |
| ESLint (`apps/web/eslint.config.mjs`) | 템플릿(`ddd-fsd-boundaries.md`)의 FSD 부분 | FSD 레이어 방향 |
| ESLint (루트 `eslint.config.mjs`) | `any`, floating promise, 함수 길이, Nx 프로젝트 경계(tag) | 공통 |
| dependency-cruiser | `.dependency-cruiser.cjs`의 FSD 규칙 | path alias(`@/...`) 포함 레이어 경계, 같은 레이어 slice 간 import 금지, 순환 참조 |
| es-arch-check | `node ~/.claude/scripts/es-arch-check.mjs --scope apps/web --json` | critical 1건 이상이면 실패 |

CI에서는 `pnpm nx affected -t lint test typecheck build`와 `pnpm deps:check`를 PR마다 실행한다.

## 8. 리뷰 필요 사항

- [ ] 문서 언어: ewoosoft 팀 규칙상 한국어/영어 병기가 필요한지
