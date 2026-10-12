# Clever Lab Admin 백엔드 Spec

- 작성일: 2026-10-09
- 작성자: aaron.ji
- 상태: Draft (리뷰 대기)
- 관련 문서: [prd.md](../prd.md), [spec-frontend.md](./spec-frontend.md)
- 기준: ewoosoft `/es-arch` 표준 (`~/.claude/scripts/es-arch-check.mjs`, `~/.claude/templates/eslint/*`, `~/.claude/templates/claude-agents/adr-di-port.md`)

## 1. 아키텍처 규칙

`apps/api`는 아래 규칙을 지킨다. `/es-arch`와 CI가 자동으로 검사한다.

| 규칙 | 내용 | 심각도 |
| --- | --- | --- |
| `ddd-direction` | `domain`은 `infrastructure`, `presentation`을 import하지 않는다. `application`은 `presentation`을 import하지 않는다. | critical |
| `domain-purity` | `domain`에 프레임워크·영속성 데코레이터(`@Injectable`, `@Controller`, `@Schema`, `@Prop` 등)를 쓰지 않는다. | critical |
| `di-symbol-token` | `Symbol(...)` DI 토큰을 쓰지 않는다. | critical |
| `di-inject-decorator` | `@Inject(...)`를 쓰지 않는다. | critical |
| `di-i-interface` | `interface IXxxRepository` 형태를 쓰지 않는다. 포트는 `abstract class`로 선언한다. | critical |
| `port-suffix` | 영속성 포트는 `Repository`, 외부 시스템 포트는 `Gateway`로 끝난다. | warning |
| `adr-exists` | 주요 결정은 `docs/adr/`에 ADR로 남긴다. | warning |

> `es-arch-check.mjs`의 `domain-purity`는 NestJS·TypeORM 데코레이터만 검사한다. 이 프로젝트는 Mongoose를 쓰므로 `@Schema`, `@Prop`도 `domain` 금지 대상으로 정하고, ESLint 규칙에 추가한다 (7장).

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

## 3. 백엔드 구조 (apps/api)

NestJS 11(clever-lab-api와 같은 메이저), TypeScript 6.0, SWC 빌드(`@nx/js:swc`, 설정은 `apps/api/.swcrc`), Jest(`@swc/jest`) + supertest를 쓴다. 빌드는 타입 검사를 건너뛰고(`skipTypeCheck`), 타입 검사는 `typecheck` 타깃이 맡는다. Nx 생성기와 달리 `AppModule`은 `src/app.module.ts`에 둔다 (`src/app/` 폴더는 `/es-arch`가 FSD `app` 레이어로 오인한다).

### 3.1 Bounded Context

| 모듈 | 책임 | 컬렉션 |
| --- | --- | --- |
| `auth` | 기존 운영자 계정 로그인, JWT 발급, 인증 Guard, 실패 잠금 | `clkManagers` (운영 DB) |
| `lab` | 기공소 조회, 프로필 필드 수정, 소속 Sub-lab 조회 | `clkLabs`, `clkSubLabs` (읽기) |
| `lab-order` | 의뢰서 조회, 메모성 필드 수정, 연결 명세서 조회 | `clkLabOrders` |
| `bill` | 거래 명세서 조회, 메모 필드 수정, 연결 의뢰서 조회 | `clkBills` |
| `invoice` | 회계 조회 (1차 조회 전용), 연결 명세서 조회 | `clkInvoices` (읽기) |
| `audit-log` | 수정 이력(감사 로그)과 상세 조회 이력(접근 로그) 기록·조회 | `adminAuditLogs`, `adminAccessLogs` (어드민 DB) |

**쓰기 제한 (PRD 2장, 5장 "연쇄 처리")**

- 삭제 기능은 만들지 않는다. 리포지토리 포트에 `delete` 메서드를 두지 않고, 운영 DB에 `deleteOne`/`deleteMany`를 호출하지 않는다 (7장 ESLint 규칙으로 차단).
- 수정은 PRD에서 허용한 필드만 바뀐 것만 `$set`으로 쓴다. 금액, 상태, 연결 필드(`billId`, `orderIds`, `invoiceId`, `bills`)는 도메인 엔티티에 변경 메서드를 두지 않는다.

### 3.2 디렉터리 구조

모든 모듈이 같은 4계층 구조를 쓴다. `lab-order`를 예로 든다.

```
apps/api/src/
├── main.ts                                    # 전역 prefix /api
├── app.module.ts
├── modules/
│   ├── auth/
│   ├── lab/
│   ├── lab-order/
│   │   ├── domain/
│   │   │   ├── lab-order.ts                  # 도메인 엔티티 (순수 TS)
│   │   │   ├── lab-order-status.ts           # 값 객체 / 상수
│   │   │   ├── lab-order.repository.ts       # 포트 (abstract class)
│   │   │   └── index.ts                      # 다른 모듈에 공개하는 것만 export
│   │   ├── application/
│   │   │   ├── find-lab-orders.use-case.ts
│   │   │   ├── get-lab-order-detail.use-case.ts
│   │   │   └── update-lab-order.use-case.ts
│   │   ├── infrastructure/
│   │   │   ├── lab-order.schema.ts           # Mongoose @Schema/@Prop
│   │   │   ├── lab-order.mapper.ts           # Document <-> 도메인 엔티티
│   │   │   └── mongoose-lab-order.repository.ts
│   │   ├── presentation/
│   │   │   ├── lab-order.controller.ts
│   │   │   └── dto/
│   │   └── lab-order.module.ts
│   ├── bill/
│   ├── invoice/
│   └── audit-log/
└── shared/
    ├── infrastructure/
    │   ├── mongo/                            # 운영 DB, 어드민 DB 커넥션
    │   └── lab-ref-filter.ts                 # Lab 참조 키 혼재 대응 쿼리
    └── presentation/
        ├── pagination.dto.ts
        └── http-exception.filter.ts
```

### 3.3 계층별 책임과 의존 방향

```
presentation ──> application ──> domain <── infrastructure
```

| 계층 | 책임 | import 가능 | import 금지 |
| --- | --- | --- | --- |
| `domain` | 엔티티, 값 객체, 도메인 규칙, 포트 정의 | 같은 모듈의 `domain`, 다른 모듈 `domain/index.ts` | `application`, `infrastructure`, `presentation`, `@nestjs/*`, `mongoose` |
| `application` | 유스케이스. 포트를 호출하고 트랜잭션 경계와 감사 로그 기록을 맡는다. | `domain`, `@nestjs/common`(`@Injectable`만) | `presentation`, `infrastructure` |
| `infrastructure` | Mongoose 스키마, 리포지토리 구현, Document 매핑 | `domain`, `mongoose`, `@nestjs/mongoose` | `presentation` |
| `presentation` | REST 컨트롤러, DTO, 요청 검증, 인증 Guard 적용 | `application`, `domain`(타입만), `contracts` | `infrastructure` |

- `application`이 `infrastructure`를 import하지 않는 것은 이 프로젝트에서 추가로 정하는 규칙이다. 포트로만 접근한다.

### 3.4 DI 포트 (ADR-DI-port 준수)

포트는 `domain`에 `abstract class`로 선언하고, 구현체는 `infrastructure`에서 `extends`한다.

```ts
// modules/lab-order/domain/lab-order.repository.ts
export abstract class LabOrderRepository {
  abstract findPage(query: LabOrderQuery): Promise<Page<LabOrder>>;
  abstract findById(id: string): Promise<LabOrder | null>;
  abstract findByBillId(billId: string): Promise<LabOrder[]>;
  abstract update(order: LabOrder, expectedUpdatedAt: Date): Promise<void>; // 허용 필드만 $set
}

// modules/lab-order/infrastructure/mongoose-lab-order.repository.ts
@Injectable()
export class MongooseLabOrderRepository extends LabOrderRepository { /* ... */ }

// modules/lab-order/lab-order.module.ts
@Module({
  providers: [{ provide: LabOrderRepository, useClass: MongooseLabOrderRepository }],
  exports: [LabOrderRepository],
})
export class LabOrderModule {}

// modules/lab-order/application/get-lab-order-detail.use-case.ts
@Injectable()
export class GetLabOrderDetailUseCase {
  constructor(
    private readonly labOrders: LabOrderRepository,
    private readonly bills: BillRepository,
  ) {}
}
```

금지 패턴: `const LAB_ORDER_REPOSITORY = Symbol(...)`, `interface ILabOrderRepository`, `@Inject(LAB_ORDER_REPOSITORY)`

### 3.5 모듈 간 참조 (연결 문서 조회)

PRD의 연결 문서 표시 요구는 모두 모듈 경계를 넘는다. 아래 규칙으로만 참조한다.

| 화면 | 호출하는 유스케이스 | 사용하는 다른 모듈 포트 |
| --- | --- | --- |
| 의뢰서 상세 → 연결 명세서 | `lab-order/GetLabOrderDetailUseCase` | `BillRepository.findByIds(teethDetails[].billId)` |
| 명세서 상세 → 연결 의뢰서 | `bill/GetBillDetailUseCase` | `LabOrderRepository.findByIds(orderIds)`, 비어 있으면 `findByBillId(bill.id)` |
| 회계 상세 → 연결 명세서, 명세서 합계 대조 | `invoice/GetInvoiceDetailUseCase` | `BillRepository.findByIds(bills[])`. 대조 계산(`isDeleted` 제외 합계 vs `charged`·`incurred`)은 `invoice` 도메인 서비스에 둔다 |
| 회계 월별 이력 | `invoice/GetInvoiceHistoryUseCase` | 같은 모듈의 `InvoiceRepository.findByLabAndPartner(labId, partnerId)` (`periodTimeTimeStamp` 오름차순) |
| 문서 상세 → 수정 이력 | 각 모듈의 상세 유스케이스 | `AuditLogRepository.findByTarget(type, id)` |

Lab 상세의 소속 Sub-lab 목록은 같은 `lab` 모듈의 `SubLabRepository.findByLabUUID(lab.id)`로 조회한다 (삭제된 Sub-lab 제외). Sub-lab은 Lab과 같은 Bounded Context로 본다.

- 다른 모듈은 그 모듈의 `domain/index.ts`가 export한 포트와 엔티티만 import한다. `infrastructure`나 유스케이스는 직접 import하지 않는다.
- NestJS 모듈은 포트만 `exports`하고, 사용하는 쪽 모듈이 `imports`한다.
- 순환 참조 주의: `lab-order`와 `bill`이 서로의 포트를 쓴다. 모듈 `imports`에서 순환이 생기면 `forwardRef` 대신 상세 조회 유스케이스를 한쪽 모듈에만 두고 다른 쪽 포트를 가져다 쓴다. 이 방식이 계속 꼬이면 별도 `document-link` 조회 모듈로 분리한다.

### 3.6 도메인 엔티티와 Mongoose 스키마 분리

- `domain`의 엔티티는 순수 TypeScript 클래스다. `@Schema`, `@Prop`, `Document`를 쓰지 않는다.
- Mongoose 스키마는 `infrastructure/*.schema.ts`에 둔다.
- `infrastructure/*.mapper.ts`가 Document와 도메인 엔티티를 변환한다. 저장 타입 차이(Lab·LabOrder는 unix 초, Bill·Invoice는 Date)는 mapper에서 `Date`로 통일한다. 그래서 `domain` 이상 계층은 `Date`만 다룬다.
- 도메인 엔티티에는 어드민이 쓰는 필드만 둔다. 수정 가능 필드(PRD 오픈 이슈)가 확정되면 그 필드만 변경 메서드로 연다.

```ts
// modules/bill/domain/bill.ts
export class Bill {
  constructor(private props: BillProps) {}

  // 허용 필드만 변경 메서드로 연다. 금액·상태·연결 필드는 변경 메서드가 없다.
  changeMemo(memo: string | undefined, privateNote: string | undefined): void {
    this.props.memo = memo;
    this.props.privateNote = privateNote;
  }
}
```

### 3.7 스키마 소스 (clever-lab-api 엔티티)

- 원본: `~/vatech/project/clever-lab-api/libs/entities/src`
- 어드민의 `infrastructure/*.schema.ts`가 원본 스키마를 어떻게 가져올지는 결정이 필요하다 (PRD 오픈 이슈와 같은 항목). ADR-0003으로 기록한다.

| 방법 | 장점 | 단점 |
| --- | --- | --- |
| A. 원본 스키마 패키지 참조 | 스키마 변경이 자동 반영된다 | clever-lab-api 배포와 버전 결합. 원본에 GraphQL 등 불필요한 의존성이 따라온다 |
| B. 필요한 필드만 복사 + `strict: false` (추천) | 의존성이 없다. 모르는 필드도 덮어쓰지 않고 보존한다 | 원본 필드명이 바뀌면 수동으로 따라가야 한다 |

- B를 고르면 수정은 `$set`으로 바뀐 필드만 쓴다. 문서 전체를 저장하지 않으므로 어드민이 모르는 필드를 지우지 않는다.

### 3.8 공통 관심사

| 항목 | 위치 | 방식 |
| --- | --- | --- |
| 인증 | `auth/presentation` | `@nestjs/jwt`로 access token 발급 (만료 8시간, refresh 없음). 쿠키 `lab_admin_token` (httpOnly, Secure, SameSite=Strict). 전역 `JwtAuthGuard`(APP_GUARD)가 쿠키를 검증하고, `@Public()`(`shared/presentation/public.decorator.ts`)이 붙은 로그인·로그아웃·헬스체크만 예외. 역할은 1개라 권한 Guard는 두지 않는다 |
| 원본 문서 조회 | 각 모듈 리포지토리 `findRawById(id)` | 도메인 엔티티를 거치지 않고 Mongo 문서를 plain object로 반환한다 (`lean()`). 어드민 도메인이 모델링하지 않은 필드까지 보기 위함이다. 마스킹은 application에서 적용한다 |
| 로그인 검증 | `auth/domain` (`Manager.attemptLogin`, `password.ts`) | 도메인 규칙으로 둔다. pbkdf2-sha512(1026회, 64바이트, `loginPasswordSalt`), 5회 실패 시 잠금 (clkgraph `managerLogin`과 같은 규칙). 비밀번호 해시는 `node:crypto`만 쓰므로 포트를 두지 않는다. 저장은 `ManagerRepository.saveLoginState`가 `failCnt`, `locked`만 `$set`한다 |
| 인증 오류 응답 | `auth/presentation/auth.controller.ts` | 아이디 없음·비밀번호 틀림 → 401 `INVALID_CREDENTIALS`, 잠김 → 423 `ACCOUNT_LOCKED`, 세션 없음·만료 → 401 `UNAUTHENTICATED`. 본문은 `ErrorResponse { code, message }` |
| 설정 | `config/env.ts`, `apps/api/.env.example` | `MONGODB_URI`, `JWT_SECRET`(32자 이상) 필수. 없으면 서버가 뜨지 않는다. Nx가 `apps/api/.env`를 읽어 넣는다 |
| 앱 공통 설정 | `app.setup.ts` | `/api` prefix, cookie-parser, `ValidationPipe(whitelist, forbidNonWhitelisted)`. `main.ts`와 테스트가 같이 쓴다 |
| 감사 로그 | `audit-log` 모듈 포트 `AuditLogRepository` | 수정 유스케이스가 직접 호출한다. 인터셉터를 쓰지 않는 이유는 변경 전/후 값을 유스케이스만 알기 때문이다. |
| 접근 로그 | `audit-log` 모듈 포트 `AccessLogRepository` | 상세 조회 유스케이스가 호출한다 (작업자, 시각, 대상) |
| 낙관적 잠금 | 각 `infrastructure` 리포지토리 | `updateOne({ id, updatedAt: expected }, { $set })`. 매칭 0건이면 `ConcurrentModificationError` |
| Lab 참조 키 혼재 | `shared/infrastructure/lab-ref-filter.ts` | `$or: [{ labId: lab.labId }, { labUUID: lab.id }, { labId: lab.id }]` 생성 함수 하나로 통일 |
| 페이지네이션 | `shared/presentation/pagination.dto.ts` | `page`, `size` (기본 20, 최대 100) |
| 에러 응답 | `shared/presentation/http-exception.filter.ts` | 도메인 에러 → HTTP 상태 코드 매핑 |
| DB 커넥션 | `shared/infrastructure/mongo` | 운영 DB(`clkLabs`, `clkSubLabs`, `clkLabOrders`, `clkBills`, `clkInvoices`, `clkManagers`), 어드민 DB(감사 로그, 접근 로그) 2개 커넥션. 운영 DB 계정 권한은 PRD 7장 |

## 4. API 계약 (packages/contracts)

```
packages/contracts/src/
├── common.ts        # Page<T>, PageQuery, ErrorResponse
├── auth.ts
├── lab.ts
├── lab-order.ts
├── bill.ts
├── invoice.ts
└── index.ts
```

- `presentation/dto`에서 contracts 타입을 `implements`하고, `class-validator`로 검증한다.
- 날짜는 ISO 8601 문자열로 주고받는다.
- contracts의 소유자는 백엔드다. 프론트엔드 사용 방식은 [spec-frontend.md](./spec-frontend.md) 참고.

## 5. 요청 흐름 예시: 의뢰서 상세 조회

```
presentation/LabOrderController.getDetail
 └─ application/GetLabOrderDetailUseCase
      ├─ LabOrderRepository.findById(id)          (domain 포트)
      └─ BillRepository.findByIds(billIds)         (bill 모듈 domain 포트)
           └─ infrastructure/MongooseBillRepository  (DI로 주입)
```

1차 구현은 상세 API 응답에 연결 문서 요약을 포함한다. 화면당 API 호출을 하나로 유지하기 위함이다.

## 6. ADR 목록

M1에서 `docs/adr/`에 아래 ADR을 만든다.

| 번호 | 제목 | 상태 |
| --- | --- | --- |
| ADR-0001 | DI 포트는 abstract class로 선언 (`~/.claude/templates/claude-agents/adr-di-port.md` 복사) | Accepted |
| ADR-0002 | 도메인 엔티티와 Mongoose 스키마 분리, mapper로 시간 타입 통일 | Proposed |
| ADR-0003 | clever-lab-api 스키마 소스 방식 (3.7의 A/B) | Proposed |
| ADR-0004 | 운영 DB 쓰기 범위 제한 (허용 필드 `$set`만, 삭제 금지), 어드민 DB 분리 | Proposed |

## 7. 규칙 강제 방법

| 도구 | 설정 | 근거 |
| --- | --- | --- |
| ESLint (`apps/api/eslint.config.mjs`) | 템플릿(`ddd-fsd-boundaries.md`의 DDD 부분, `no-symbol-di.md`) + 추가 규칙 | DDD 방향, Symbol DI·`@Inject` 금지 |
| ESLint (추가) | `domain/**`에서 `mongoose`, `@nestjs/*` import 금지 | 3.3, 3.6 |
| ESLint (추가) | `application/**`에서 `infrastructure/**` import 금지 | 3.3 |
| ESLint (추가) | `infrastructure/**`에서 `deleteOne`, `deleteMany`, `findOneAndDelete`, `findByIdAndDelete`, `remove` 호출 금지 | 3.1 쓰기 제한 |
| ESLint (루트 `eslint.config.mjs`) | `any`, floating promise, 함수 길이, Nx 프로젝트 경계(tag) | 공통 |
| dependency-cruiser | `.dependency-cruiser.cjs`의 DDD 규칙 | 레이어 경계, 순환 참조 |
| es-arch-check | `node ~/.claude/scripts/es-arch-check.mjs --scope apps/api --json` | critical 1건 이상이면 실패 |

CI에서는 `pnpm nx affected -t lint test typecheck build`와 `pnpm deps:check`를 PR마다 실행한다.

## 8. 리뷰 필요 사항

- [ ] 스키마 소스 방식 A/B 선택 (3.7)
- [ ] `lab-order` ↔ `bill` 상호 참조 처리 방식 (3.5): 우선 한쪽 모듈에 두기, 문제가 되면 `document-link` 모듈로 분리
- [ ] 문서 언어: ewoosoft 팀 규칙상 한국어/영어 병기가 필요한지
