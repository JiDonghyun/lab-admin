# Clever Lab Admin 개발 계획

- 작성일: 2026-10-17
- 작성자: aaron.ji
- 상태: Draft (리뷰 대기)
- 관련 문서: [spec.md](./spec.md) (요구사항), [design/backend.md](./design/backend.md), [design/frontend.md](./design/frontend.md), [tasks](./tasks), [ADR](./adr)

## 1. 진행 방식

- 도메인 하나를 조회부터 수정까지 끝낸 뒤 다음 도메인으로 넘어간다. 순서는 Lab → 의뢰서 → 거래 명세서 → 회계다.
- **1차 목표는 Phase 1 완료(로그인 후 Lab 목록 출력)**다.
- 개발과 시연은 로컬 MongoDB로 한다. QA·운영 DB에는 Phase 6에서 처음 연결한다.
- 마일스톤(M0~M11)은 [spec.md](./spec.md)의 범위를 기준으로 나눈다. Phase는 마일스톤을 목표 단위로 묶은 것이다.
- SDD(Spec-Driven Development)로 진행한다.

  | 단계 | 문서 | 내용 |
  | --- | --- | --- |
  | 요구사항 | [spec.md](./spec.md) | 무엇을, 왜. 요구사항 ID와 수용 기준 |
  | 설계 | [design/](./design), [adr/](./adr) | 어떻게. 구조, 규칙, 결정 기록 |
  | 계획 | plan.md (이 문서) | 기술 스택, Phase와 마일스톤 순서 |
  | 작업 | [tasks/](./tasks) | 마일스톤별 작업, 요구사항 ID, 완료 조건 체크리스트. **구현 전에 쓰고 승인받는다** |

- 4장의 마일스톤별 내용은 개요다. 마일스톤을 시작할 때 `tasks/Mx-*.md`로 구체화하고, 구체화한 뒤에는 tasks 문서가 기준이다.

## 2. 기술 스택

### 2.1 공통

| 항목          | 선택                 | 버전 | 비고                                                                       |
| ------------- | -------------------- | ---- | -------------------------------------------------------------------------- |
| 런타임        | Node.js              | 24   | CI도 24                                                                    |
| 패키지 매니저 | pnpm workspace       | 11   | 설치 스크립트는 `pnpm-workspace.yaml`의 `allowBuilds`에서 허용한 것만 실행 |
| 모노레포      | Nx                   | 23.2 | 팀 표준. 앱은 Nx 플러그인으로 생성하고 타깃은 Nx가 추론·캐시               |
| 언어          | TypeScript           | 6.0  | TypeScript 7은 typescript-eslint가 아직 지원하지 않음                      |
| 패키지 스코프 | `@lab-admin`         | -    | `@lab-admin/api`, `@lab-admin/web`, `@lab-admin/contracts`                 |
| API 계약      | `packages/contracts` | -    | 요청·응답 타입만 둔다 (Phase 1 M2에서 생성)                                |
| 포맷          | Prettier             | 3    | CI에서 `nx format:check`                                                   |

### 2.2 백엔드 (`apps/api`)

| 항목       | 선택                                                                  | 비고                                        |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------- |
| 프레임워크 | NestJS 11                                                             | clever-lab-api와 같은 메이저                |
| 빌드       | webpack (`@nx/webpack`, `NxAppWebpackPlugin`)                         | Nx 생성기 기본값. clever-rc와 같은 구성     |
| 테스트     | Jest 30 + ts-jest, supertest                                          |                                             |
| DB         | MongoDB, Mongoose + `@nestjs/mongoose`                                | 운영 DB와 어드민 DB 2개 커넥션 (ADR-0004)   |
| 인증       | `@nestjs/jwt`, cookie-parser                                          | httpOnly 쿠키 `lab_admin_token`, 만료 8시간 |
| 요청 검증  | `ValidationPipe` + class-validator                                    | `whitelist`, `forbidNonWhitelisted`         |
| 구조       | DDD 4계층 (`domain`, `application`, `infrastructure`, `presentation`) | DI 포트는 abstract class (ADR-0001)         |

### 2.3 프론트엔드 (`apps/web`)

| 항목      | 선택                                                                   | 비고                                                                     |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 빌드      | Vite 8 (`@nx/vite`)                                                    | 개발 서버 4200, `/api`는 3000으로 프록시                                 |
| UI        | React 19, Ant Design 6                                                 | `ConfigProvider` 한국어 locale. CRUD 프레임워크는 쓰지 않음 (ADR-0005)   |
| 라우팅    | React Router 8                                                         | 라이브러리 모드 (`createBrowserRouter`). SSR 프레임워크 모드는 쓰지 않음 |
| 서버 상태 | TanStack Query 5                                                       | Phase 1 M3에서 추가                                                      |
| 날짜      | dayjs + `utc`, `timezone` 플러그인                                     | Asia/Seoul 기준 표시·검색                                                |
| 테스트    | Vitest 4 + Testing Library (jsdom)                                     |                                                                          |
| 구조      | FSD (`app` > `pages` > `widgets` > `features` > `entities` > `shared`) | `@/` 별칭으로 레이어 간 import                                           |

### 2.4 규칙 검사

| 도구                  | 검사 내용                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| ESLint 9 (루트)       | Nx 프로젝트 경계(tag), `any` 금지, 함수 길이                                  |
| ESLint (api)          | DDD 방향, Symbol DI·`@Inject` 금지, infrastructure의 삭제 호출 금지           |
| ESLint (web)          | FSD 레이어 방향, slice 내부 파일 직접 import 금지                             |
| dependency-cruiser 18 | DDD·FSD 경계, 같은 레이어 slice 간 import 금지, 순환 참조 (`pnpm deps:check`) |
| es-arch-check         | ewoosoft 아키텍처 검사. critical 0건 유지                                     |

CI(GitHub Actions)는 PR마다 `format:check`, `lint test build typecheck`, `deps:check`를 실행한다.

## 3. Phase 요약

| Phase          | 마일스톤 | 목표                                   | 산출물                                           | 상태 |
| -------------- | -------- | -------------------------------------- | ------------------------------------------------ | --------------------- |
| 0. 문서 확정   | M0       | 요구사항과 설계 확정                   | 확정 spec, 오픈 이슈 정리                        | 진행 중 (문서 작성 완료, 리뷰 전) |
| 1. 기반        | M1~M3    | 로그인 후 Lab 목록 출력 (**1차 목표**) | 모노레포, 레이아웃, 로그인, Lab 목록             | M1 구현·검증 완료, 코드 리뷰 전 |
| 2. Lab         | M4~M5    | Lab 메뉴 완성                          | Lab 검색·상세·수정, 접근 로그, 감사 로그         | 미착수 |
| 3. 의뢰서      | M6~M7    | 의뢰서 메뉴 완성                       | 의뢰서 목록·검색·상세·수정                       | 미착수 |
| 4. 거래 명세서 | M8~M9    | 거래 명세서 메뉴 완성                  | 명세서 목록·검색·상세·수정, 의뢰서 ↔ 명세서 연결 | 미착수 |
| 5. 회계        | M10      | 회계 메뉴 완성 (조회 전용)             | 회계 목록·상세, 명세서 합계 대조, 월별 이력      | 미착수 |
| 6. 검증·배포   | M11      | 운영 오픈                              | QA 검증, 운영 배포                               | 미착수 |

상태는 마일스톤이 끝나거나 시작할 때 고친다. 세부 진행은 각 `tasks/Mx-*.md`의 체크리스트에서 본다.

## 4. Phase별 계획

### Phase 0. 문서 확정 (M0)

- spec, design(backend, frontend), ADR 리뷰
- Phase 1 시작 전에 정할 오픈 이슈
  - 스키마 소스 방식 (ADR-0003, design/backend.md 3.7)
  - 로컬 개발용 데이터 준비 방법 (시드 데이터 또는 QA DB 덤프)
  - 개발자가 쓸 `clkManagers` 계정
- 나머지 오픈 이슈는 해당 Phase 전까지 정한다 (6장).

### Phase 1. 기반 (M1~M3)

**M1. 모노레포, 공통 레이아웃** → [tasks/M1-monorepo.md](./tasks/M1-monorepo.md)

- 앱 생성(`apps/api`, `apps/web`), 빈 메뉴가 있는 레이아웃, ESLint·dependency-cruiser 레이어 규칙, 루트 스크립트와 CI

**M2. 로그인** (요구사항 AUTH-01~08)

- `packages/contracts` 생성 (`scope:shared`, 타입만)
- api
  - 설정: `config/env.ts`. `MONGODB_URI`, `JWT_SECRET`(32자 이상)이 없으면 서버가 뜨지 않는다. `apps/api/.env.example`
  - `shared/infrastructure/mongo`: 운영 DB, 어드민 DB 커넥션
  - `auth` 모듈
    - domain: `Manager.attemptLogin`, `password.ts` (pbkdf2-sha512, 1026회, 64바이트, `loginPasswordSalt`), 5회 실패 시 잠금
    - infrastructure: `ManagerRepository.saveLoginState`는 `failCnt`, `locked`만 `$set`
    - presentation: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. 오류 코드 `INVALID_CREDENTIALS`(401), `ACCOUNT_LOCKED`(423), `UNAUTHENTICATED`(401)
  - 전역 `JwtAuthGuard`(APP_GUARD)와 `@Public()`. 로그인·로그아웃·헬스체크만 예외
  - `app.setup.ts`에 cookie-parser, `ValidationPipe` 추가
- web
  - `shared/api`: fetch 클라이언트 (`credentials: include`), 401이면 로그인 화면으로 이동
  - `entities/session`(`GET /auth/me`), `features/auth-login`, `features/auth-logout`, `pages/login`
  - `app`에 인증 라우트 가드
- 테스트: 비밀번호 검증이 clever-lab-api와 같은 결과를 내는지, 잠금 규칙, 로그인 e2e (supertest)

**M3. Lab 목록** (1차 목표, 요구사항 LAB-01, SEC-03)

- api: `lab` 모듈 `GET /labs?page=&size=` (기본 20건, 최대 100건, `createdAt` 내림차순), `shared/presentation/pagination.dto.ts`
- web: TanStack Query 추가, `entities/lab`, `widgets/lab-table`, `pages/lab-list`. 페이지 번호는 URL query string에 둔다
- 목록의 로딩, 빈 결과, 오류 상태를 구분해서 보여준다

**Phase 1 완료 기준**: 로컬 MongoDB에서 로그인 → Lab 목록 → 로그아웃을 시연한다.

### Phase 2. Lab (M4~M5)

**M4. Lab 검색·상세, 접근 로그** (요구사항 LAB-02~05, COM-01, COM-03, LOG-02, LOG-03, SEC-04)

- 검색: 기공소명, 기공소 ID, 사업자번호, 상태
- 상세: 기본 정보, 주소, 사업자/계좌 정보, 영업일/시간, 기능 사용 여부, 이미지, 소속 Sub-lab (`SubLabRepository.findByLabUUID`)
- 원본 문서 보기: `GET /labs/:id/raw`, `widgets/raw-document-viewer`
- `audit-log` 모듈 시작: 어드민 DB `adminAccessLogs`, `AccessLogRepository`. 상세 조회 유스케이스가 기록한다
- 개인정보 마스킹 (`shared/lib`): 목록은 마스킹, 상세는 전체 표시

**M5. Lab 수정, 감사 로그** (요구사항 LAB-06, LAB-07, AUDIT-01~03, LOG-01, COM-04, DATA-02, DATA-03)

- `PATCH /labs/:id`: 허용 필드만 바뀐 것만 `$set`. `updatedAt` 낙관적 잠금 (`ConcurrentModificationError`)
- `features/lab-edit`: 수정 전 확인 모달에 변경 전/후 값
- 감사 로그: `adminAuditLogs`, `AuditLogRepository`. 수정 유스케이스가 직접 기록
- `GET /audit-logs`, `pages/audit-log-list`, `widgets/audit-history-panel`

### Phase 3. 의뢰서 (M6~M7)

**M6. 의뢰서 목록·검색·상세** (요구사항 ORD-01~07, COM-05, PERF-01)

- 검색: 의뢰서 ID(정확 일치), `requestId`(기공소 선택 필수), 기공소별, 의뢰일·납품일 기간
  - 기공소별 조건은 `shared/infrastructure/lab-ref-filter.ts`로 만든다 (Lab 참조 키 혼재)
  - 쿼리는 기존 인덱스(`labId + orderDate`, `labId + dueDate`)를 타야 한다
- 상세: 기본 정보, 환자·치과 정보, 치아별 상세, 메모, 금액, 원본 문서 보기, 접근 로그
- 시간 필드(unix 초)는 mapper에서 `Date`로 바꾼다 (ADR-0002)

**M7. 의뢰서 수정** (요구사항 ORD-09, ORD-10, DATA-01)

- 메모성 필드만 (`notes`, 납품일 후보). 상태·금액·치아별 상세·`billId`는 수정하지 않는다

### Phase 4. 거래 명세서 (M8~M9)

**M8. 명세서 목록·검색·상세, 연결 패널** (요구사항 BILL-01~06, ORD-08, COM-02)

- 목록: `isDeleted` 기본 제외, "삭제 포함" 토글
- 상세: 스냅샷(`lab`, `partner`), 금액 내역, 조정 내역, 공유 상태, 변경 이력, 회계 링크
- 연결 패널 (design/backend.md 3.5)
  - 명세서 → 의뢰서: `orderIds`, 비어 있으면 `teethDetails.billId`로 역조회
  - 의뢰서 → 명세서: 의뢰서 상세에 `widgets/related-bills-panel` 추가
  - `lab-order`와 `bill`이 서로의 포트를 쓴다. 모듈 순환이 생기면 상세 유스케이스를 한쪽 모듈에만 둔다

**M9. 명세서 수정** (요구사항 BILL-07, BILL-08)

- 메모 필드만 (`memo`, `privateNote` 후보)

### Phase 5. 회계 (M10)

요구사항: INV-01~07

- 목록·검색: 회계 ID, 기공소별, 월별(`periodTime` `MM/YYYY`, `labId + periodTime` 인덱스)
- 상세: 스냅샷, 금액 요약, 입금 이력, 마감 정보, 연결 명세서 패널
- 명세서 합계 대조: 연결 명세서(`isDeleted` 제외) 합계와 `charged`·`incurred` 비교, 차이 강조. 계산은 `invoice` 도메인 서비스에 둔다
- 월별 회계 이력: 같은 기공소·거래처의 회계를 `periodTimeTimeStamp` 오름차순으로 나열
- 조회 전용. 수정 단계가 없다

### Phase 6. 검증·배포 (M11)

요구사항: SEC-01, SEC-02, LOG-04, PERF-02, ENV-01, ORD-06(운영 데이터로 재확인)

- 운영 DB 어드민 전용 계정 발급 (spec 7장 권한 범위)
- QA 환경 검증
  - QA 운영자 계정으로 로그인 (비밀번호 해시 방식 확인)
  - 주요 목록 쿼리 `explain`으로 인덱스 사용 확인, 목록 응답 1초 이내
  - clever-lab-api 화면과 의뢰서 수, 명세서 청구액, 회계 미수액 대조
- 배포: 사내망 또는 VPN, IP 허용 목록. 감사·접근 로그 보존 정책 적용

## 5. 공통 완료 기준 (M1~M10)

- 로컬 MongoDB에서 해당 단계의 화면과 API가 동작하는 것을 시연한다
- 도메인·유스케이스 단위 테스트가 통과한다
- `pnpm lint`, `pnpm deps:check`, es-arch-check critical 0건
- 코드 리뷰를 마친다

## 6. 오픈 이슈와 필요한 시점

| 오픈 이슈 (spec 8장)                                   | 필요한 시점                 |
| ------------------------------------------------------ | --------------------------- |
| 스키마 소스 방식 (ADR-0003)                            | Phase 1 (M2) 전             |
| 로컬 개발용 데이터 준비                                | Phase 1 (M2) 전             |
| 개발자용 `clkManagers` 계정                            | Phase 1 (M2) 전             |
| Lab 검색 항목 확정                                     | Phase 2 (M4) 전             |
| 개인정보 마스킹 범위                                   | Phase 2 (M4) 전             |
| 엔티티별 수정 가능 필드                                | 각 수정 단계(M5, M7, M9) 전 |
| 역할 구분 필요 여부                                    | Phase 2 (M5) 전             |
| 거래 명세서 기간/상태 검색                             | Phase 4 (M8) 전             |
| 감사·접근 로그 보존 기간 (법무·보안)                   | Phase 6 전                  |
| 배포 환경 (사내망, VPN, 도메인)                        | Phase 6 전                  |
| 성공 기준 측정 방법                                    | Phase 6 전                  |
| 2차: 삭제·금액·상태 변경을 clever-lab-api 관리자 API로 | 1차 오픈 후                 |
