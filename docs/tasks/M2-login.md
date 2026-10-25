# M2. 로그인

- 상태: Draft
- Phase: 1. 기반
- 요구사항: AUTH-01~08
- 설계: design/backend.md 2장, 3.1, 3.4, 3.6, 3.8, 4장 / design/frontend.md 3.2, 3.3, 4장 / ADR-0001, ADR-0002, ADR-0003, ADR-0004

## 목표

로컬 MongoDB의 시드 계정으로 로그인하면 레이아웃이 나오고, 로그아웃하거나 토큰이 없으면 로그인 화면으로 돌아간다.

## 요구사항

- [ ] AUTH-01 로그인 성공 시 JWT를 httpOnly, Secure 쿠키로 발급하고 `failCnt`를 0으로 되돌린다
- [ ] AUTH-02 비밀번호 해시가 clever-lab-api와 같다 (pbkdf2-sha512, 1026회, 64바이트)
- [ ] AUTH-03 없는 아이디와 틀린 비밀번호는 같은 메시지로 거부한다
- [ ] AUTH-04 비밀번호가 틀리면 `failCnt`를 1 올리고, 5회가 되면 잠근다
- [ ] AUTH-05 잠긴 계정(`locked: true` 또는 `failCnt` 5 이상)은 비밀번호가 맞아도 거부한다
- [ ] AUTH-06 토큰은 발급 8시간 뒤 만료된다
- [ ] AUTH-07 로그아웃하면 쿠키를 삭제하고, 이후 요청은 401이다
- [ ] AUTH-08 인증 없이 로그인 외 API를 부르면 401, 화면은 로그인 화면으로 이동한다

## 작업

### T1. `packages/contracts`

- 근거: design/backend.md 2장, 4장
- [ ] `nx g @nx/js:lib packages/contracts --importPath=@lab-admin/contracts --bundler=none --unitTestRunner=none --tags=scope:shared --useProjectJson`
- [ ] `common.ts`: `ErrorResponse { code, message }`
- [ ] `auth.ts`: `LoginRequest { managerId, password }`, `SessionResponse { managerId, name }`, `AuthErrorCode` (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `UNAUTHENTICATED`)
- [ ] 검증: api와 web에서 `@lab-admin/contracts`를 import해 typecheck가 통과한다

### T2. api 설정과 운영 DB 커넥션

- 근거: design/backend.md 3.8 (설정, 앱 공통 설정, DB 커넥션)
- [ ] 의존성: `@nestjs/mongoose`, `mongoose`, `@nestjs/jwt`, `cookie-parser`, `class-validator`, `class-transformer`
- [ ] `src/config/env.ts`: `MONGODB_URI`, `JWT_SECRET`(32자 이상)을 읽고, 없거나 짧으면 에러를 던진다
- [ ] `apps/api/.env.example` (로컬 MongoDB 주소, 예시 시크릿). `.env`는 gitignore
- [ ] `shared/infrastructure/mongo`: 운영 DB 커넥션 모듈 (`MongooseModule.forRootAsync`)
- [ ] `app.setup.ts`: cookie-parser, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
- [ ] 검증: `env.ts` 단위 테스트 (값 없음, 32자 미만 → 에러)

### T3. 로컬 시드 스크립트

- 근거: spec.md 8장 (로컬 데이터: 시드 스크립트)
- [ ] `apps/api/scripts/seed-local.mjs`: `clkManagers`에 테스트 계정을 upsert한다 (`managerId`, `name`, `loginPassword`, `loginPasswordSalt`, `failCnt: 0`, `locked: false`). 해시는 clever-lab-api와 같은 방식
- [ ] `MONGODB_URI`의 호스트가 `localhost`, `127.0.0.1`이 아니면 실행하지 않고 종료한다
- [ ] 루트 스크립트 `pnpm seed:local` (`node --env-file=apps/api/.env ...`)
- [ ] 검증: 로컬 MongoDB에 실행하고 T5의 로그인 API로 로그인된다. 원격 주소로 실행하면 거부된다

### T4. `auth` 모듈: domain, infrastructure

- 근거: AUTH-02, AUTH-04, AUTH-05 / design/backend.md 3.4, 3.6, 3.8 / ADR-0002, ADR-0003
- [ ] `domain/password.ts`: `hashPassword(password, salt)` (pbkdf2-sha512, 1026회, 64바이트, hex), `verifyPassword`는 `timingSafeEqual`로 비교
- [ ] `domain/manager.ts`: `Manager.attemptLogin(password)` → 성공 / 비밀번호 틀림 / 잠김. 실패하면 `failCnt`를 올리고 5회면 `locked`, 성공하면 `failCnt` 0
- [ ] `domain/manager.repository.ts`: 포트 `ManagerRepository` (`findByManagerId`, `saveLoginState`)
- [ ] `infrastructure/manager.schema.ts`: `clkManagers`의 필요한 필드만, `strict: false`, `timestamps` 끔. 원본 경로 주석
- [ ] `infrastructure/manager.mapper.ts`, `mongoose-manager.repository.ts`: `saveLoginState`는 `updateOne({ id }, { $set: { failCnt, locked } })`만 쓴다
- [ ] 검증
  - `password.spec.ts`: AUTH-02 고정 벡터 (clever-lab-api `AuthService.pbkdf2Sync`로 만든 값)
  - `manager.spec.ts`: AUTH-01(`failCnt` 초기화), AUTH-04, AUTH-05
  - `mongoose-manager.repository.spec.ts`: `$set`에 `failCnt`, `locked`만 들어간다 (모델 목)

### T5. `auth` 모듈: application, presentation

- 근거: AUTH-01, AUTH-03, AUTH-05~08 / design/backend.md 3.8 (인증, 인증 오류 응답)
- [ ] `application/login.use-case.ts`: 계정 조회 → `attemptLogin` → `saveLoginState`. 없는 아이디는 비밀번호 틀림과 같은 결과
- [ ] `presentation/auth.controller.ts`
  - `POST /api/auth/login`: 성공하면 `lab_admin_token` 쿠키(httpOnly, Secure, SameSite=Strict, 8시간)와 `SessionResponse`. 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`
  - `POST /api/auth/logout`: 쿠키 삭제, 204
  - `GET /api/auth/me`: 토큰의 `managerId`, `name`
- [ ] `presentation/jwt-auth.guard.ts`: 전역 `APP_GUARD`. 쿠키가 없거나 검증에 실패하면 401 `UNAUTHENTICATED`
- [ ] `shared/presentation/public.decorator.ts`: `@Public()`. 로그인, 로그아웃, 헬스체크에 붙인다
- [ ] JWT: `@nestjs/jwt`, 만료 8시간, payload는 `sub`(manager `id`), `managerId`, `name`
- [ ] 검증: `auth.controller.spec.ts` (supertest, `ManagerRepository`는 메모리 가짜 구현)
  - AUTH-01 쿠키 속성, AUTH-03 같은 메시지, AUTH-05 423
  - AUTH-06 토큰 `exp - iat` = 8시간, 만료된 토큰은 401
  - AUTH-07 로그아웃 응답이 쿠키를 지우고, 쿠키 없는 요청은 401
  - AUTH-08 쿠키 없이 `GET /api/auth/me`는 401, `GET /api/health`는 200

### T6. web: 세션, 로그인, 로그아웃

- 근거: AUTH-07, AUTH-08 / design/frontend.md 3.2, 3.3, 4장
- [ ] TanStack Query 추가, `app`에 `QueryClientProvider`
- [ ] `shared/api`: `apiFetch` (`credentials: 'include'`, JSON). 실패하면 `ApiError { status, code, message }`를 던진다. 로그인 요청이 아닌 요청이 401이면 `/login`으로 이동한다
- [ ] `entities/session`: `useSession()` (`GET /api/auth/me`, 재시도 없음), contracts 타입 재export
- [ ] `features/auth-login`: `LoginForm` (antd `Form`, 아이디·비밀번호). 실패하면 서버 메시지 표시. 성공하면 원래 가려던 경로 또는 `/labs`로 이동
- [ ] `features/auth-logout`: `LogoutButton`. 성공하면 쿼리 캐시를 비우고 `/login`으로 이동
- [ ] `pages/login`: `LoginPage`. 라우트 `/login`은 레이아웃 밖에 둔다
- [ ] `app`: `RequireAuth`가 레이아웃 라우트를 감싼다. 세션 조회 중에는 로딩, 401이면 `/login`으로 이동
- [ ] `widgets/app-layout` 헤더에 사용자 이름과 `LogoutButton`
- [ ] 검증
  - `apiFetch.spec.ts`: AUTH-08 401이면 `/login`으로 이동, 로그인 요청의 401은 이동하지 않는다
  - `RequireAuth.spec.tsx`: AUTH-08 세션 401이면 `/login`으로 이동
  - `LoginForm.spec.tsx`: 제출 시 요청, 실패 메시지 표시

## 완료 기준

- [ ] `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm deps:check`, es-arch-check critical 0건
- [ ] 코드 리뷰
- `pnpm seed:local` 후 `pnpm dev`로 확인
  - [ ] 로그인하지 않고 `/labs`에 가면 `/login`으로 이동한다
  - [ ] 시드 계정으로 로그인하면 `/labs`가 나오고 헤더에 이름이 보인다
  - [ ] 비밀번호를 5번 틀리면 잠기고, 맞는 비밀번호로도 로그인되지 않는다 (`pnpm seed:local`로 해제)
  - [ ] 로그아웃하면 `/login`으로 이동하고, 뒤로 가기로 돌아가도 다시 `/login`으로 간다

## 결정 사항

- **OTP를 두지 않는다**: clever-lab-api 운영자 로그인은 비밀번호 뒤에 이메일 OTP를 확인하지만, 어드민은 사내망·IP 허용 목록(SEC-01)으로 접근을 제한한다. spec.md 6.1에 반영.
- **`failCnt` 5 이상도 잠금으로 본다**: clever-lab-api `login`이 `locked || failCnt >= 5`로 거부한다. spec.md AUTH-05에 반영.
- **`clkManagers` 스키마에 `timestamps`를 켜지 않는다**: 로그인 상태 저장은 `failCnt`, `locked`만 `$set`한다 (ADR-0004). clever-lab-api는 같은 갱신에서 `updatedAt`(unix 초)도 바꾸지만, 어드민은 운영 문서에 쓰는 필드를 최소로 둔다.
- **어드민 DB 커넥션은 M4에서 추가**: M2는 운영 DB만 쓴다. plan.md에 반영.
- **TanStack Query는 M2에서 추가**: `entities/session`이 처음 쓴다. plan.md에 반영.
- **토큰을 서버에서 폐기하지 않는다**: 로그아웃은 쿠키만 지운다. 쿠키를 복사해 둔 경우 만료(8시간)까지 유효하다. refresh token이 없는 1차 범위에서 받아들인다.
- **`/auth/me`는 DB를 조회하지 않는다**: 토큰 payload로 응답한다. 로그인 후 잠긴 계정도 토큰 만료까지는 쓸 수 있다.
- **에러 응답 필터는 M2에서 만들지 않는다**: Nest 예외에 `ErrorResponse` 객체를 넘기면 그대로 본문이 된다. 도메인 에러 매핑이 필요해지는 단계에서 `http-exception.filter.ts`를 만든다.
