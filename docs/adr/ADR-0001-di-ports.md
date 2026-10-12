# ADR-0001: NestJS DI ports — abstract class over Symbol+interface

> 출처: `~/.claude/templates/claude-agents/adr-di-port.md` (ewoosoft 표준). 이 프로젝트는 Mongoose를 쓰므로 예시의 구현체 이름만 바꿨다.
> 강제: `eslint.config.mjs`의 `DI_RULES`, `/es-arch`의 `di-*` 규칙.

## Status / 상태

Accepted — 2026-10-11

## Context / 맥락

ewoosoft NestJS 백엔드에서 의존성 역전(DIP)을 위한 DI 포트가 두 가지 스타일로 혼재되어 있었습니다.
ewoosoft NestJS backends mixed two DI port styles for the Dependency Inversion Principle:

1. **Symbol + interface**: `const USER_REPO = Symbol('UserRepository')` + `interface IUserRepository` + `@Inject(USER_REPO)`
2. **Abstract class**: `abstract class UserRepository { ... }` — used directly as type and DI token

혼재의 부작용 / Drawbacks of the mix:

- 일관성 부재 — 새 모듈 작성 시 어느 패턴을 따를지 모름.
  No consistency — unclear which pattern to follow when writing a new module.
- AI 코드 생성기는 첫 번째 패턴을 기본값으로 뽑는 경향 → 보일러플레이트 증가.
  AI generators default to pattern 1 → more boilerplate.
- Symbol 토큰은 타입 시스템 밖에 존재 → 리네임/리팩터에 약함.
  Symbol tokens live outside the type system → fragile under rename/refactor.

## Decision / 결정

**모든 DI 포트는 `abstract class`로 선언합니다.** `Symbol + interface` 패턴을 금지합니다.
**All DI ports MUST be declared as `abstract class`.** The `Symbol + interface` pattern is forbidden.

네이밍 컨벤션 / Naming convention:

| Suffix | 용도 / Purpose | 예시 / Example |
|---|---|---|
| `Repository` | 영속 계층 (DB, file, cache) / Persistence (DB, file, cache) | `UserRepository`, `OrderRepository` |
| `Gateway` | 외부 시스템 (HTTP, gRPC, messaging) / External systems (HTTP, gRPC, messaging) | `PaymentGateway`, `EmailGateway` |

도메인 의도가 영속이 아닌데 `Repository` 접미사를 쓰면 안 됩니다 (예: `PaymentRepository`가 HTTP 호출 → `PaymentGateway`로).
Do not use `Repository` suffix when the intent isn't persistence (e.g., a `PaymentRepository` that calls HTTP → rename to `PaymentGateway`).

## Canonical Pattern / 표준 패턴

### After (the rule) / 적용 후

```ts
// domain/user/user.repository.ts
export abstract class UserRepository {
  abstract findById(id: UserId): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}

// infrastructure/user/mongoose-user.repository.ts
@Injectable()
export class MongooseUserRepository extends UserRepository {
  async findById(id: UserId): Promise<User | null> { /* ... */ }
  async save(user: User): Promise<void> { /* ... */ }
}

// user.module.ts
@Module({
  providers: [
    { provide: UserRepository, useClass: MongooseUserRepository },
  ],
  exports: [UserRepository],
})
export class UserModule {}

// application/user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}
}
```

### Before (forbidden) / 금지 패턴

```ts
// ❌ Forbidden
export const USER_REPOSITORY = Symbol('UserRepository');

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
}

@Injectable()
export class MongooseUserRepository implements IUserRepository { /* ... */ }

providers: [{ provide: USER_REPOSITORY, useClass: MongooseUserRepository }];

constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}
```

## Consequences / 결과

긍정 / Positive:
- 보일러플레이트 감소 — 토큰 상수, `@Inject` 데코레이터, `IXxx` 인터페이스 제거.
  Less boilerplate — drop token consts, `@Inject` decorators, and `IXxx` interfaces.
- 타입 시스템 안에서 포트가 추적됨 → 리팩터링 안전성 향상.
  Ports live in the type system → safer refactors.
- AI 코드 생성기에 단일 패턴만 제시 → 출력 일관성 향상.
  One pattern to teach AI → more consistent generation.

부정 / Negative:
- Effect-TS / fp-ts 스타일 `Context.Tag` 패턴과 다름 — 함수형 진영 학습자는 이 차이를 인지해야 함.
  Differs from Effect-TS / fp-ts `Context.Tag` style — FP newcomers need to be aware.
- `abstract class`는 트랜스파일 후에도 클래스이므로 IF 인터페이스 대비 런타임 비용이 미세하게 있음 (무시 가능 수준).
  `abstract class` survives transpilation as a class, so there's a tiny runtime cost vs. erased interfaces (negligible in practice).

중립 / Neutral:
- 동일 포트에 여러 구현체가 필요하면 `useExisting` / 서브-토큰을 추가로 정의 (별도 ADR 필요 시 분리).
  When a single port needs multiple implementations, use `useExisting` / sub-tokens (split into a separate ADR if non-trivial).

## References / 참고

- ewoosoft `/es-arch` DI port section
- ewoosoft `/es-style` AI pitfall: Symbol+@Inject detection
- ewoosoft `/es-review` flag: new Symbol DI token
- ESLint snippet: `eslint/no-symbol-di.md`
