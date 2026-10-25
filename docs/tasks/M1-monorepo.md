# M1. 모노레포, 공통 레이아웃

- 상태: Approved
- Phase: 1. 기반
- 요구사항: 없음 (기반 작업)
- 설계: design/backend.md 2장, 3장, 7장 / design/frontend.md 3.1~3.3, 7장 / ADR-0001, ADR-0005

> 이 문서보다 구현이 먼저 진행됐다. 승인 후 stash `m1`을 반영해 이 문서 기준으로 검증했다.

## 목표

`pnpm dev`로 api(3000)와 web(4200)을 띄우면 빈 메뉴가 있는 레이아웃이 나오고, 레이어 규칙 검사가 CI에서 돈다.

## 작업

### T1. 패키지 스코프와 workspace 설정

- 근거: plan.md 2.1
- [x] `package.json` 이름을 `@lab-admin/source`로 변경
- [x] `tsconfig.base.json` `customConditions`를 `@lab-admin/source`로 변경
- [x] `pnpm-workspace.yaml`에 `apps/*` 추가, `allowBuilds` 설정
- [x] 검증: `pnpm install`이 경고 없이 끝난다

### T2. Nx 플러그인 추가

- 근거: design/backend.md 2장
- [x] `@nx/nest`, `@nx/webpack`, `@nx/jest`, `@nx/react`, `@nx/vite`, `@nx/vitest`, `@nx/eslint` (23.2.0) 설치, `nx.json` 등록
- [x] 검증: `pnpm nx list`에 플러그인이 보인다

### T3. `apps/api` 생성

- 근거: design/backend.md 3장
- [x] `nx g @nx/nest:app apps/api --tags=scope:api --unitTestRunner=jest --e2eTestRunner=none --enableTypedLinting --useProjectJson --strict`
- [x] `AppModule`을 `src/app.module.ts`로 옮기고 생성기 예제(`src/app/`) 삭제
- [x] `src/app.setup.ts`: `/api` prefix
- [x] `src/shared/presentation/health.controller.ts`: `GET /api/health`
- [x] 테스트를 `@swc/jest`에서 ts-jest로 변경, `tsconfig.spec.json`에 `rootDir` (TS 6 요구사항)
- [x] 검증: `pnpm nx run-many -t build test typecheck -p api`

### T4. `apps/web` 생성과 레이아웃

- 근거: design/frontend.md 3.1, 3.2, 3.5
- [x] `nx g @nx/react:app apps/web --bundler=vite --minimal --port=4200 --tags=scope:web --unitTestRunner=vitest --e2eTestRunner=none --enableTypedLinting --useProjectJson`
- [x] antd 6, React Router 8 추가
- [x] FSD 구조: `app`(Provider, 라우터), `widgets/app-layout`(사이드 메뉴 5개 + 헤더), `pages/coming-soon`(메뉴별 자리표시자), `pages/not-found`, `shared/config`(라우트 경로 상수)
- [x] `@/` 별칭 (`tsconfig.app.json`, `tsconfig.spec.json`, `vite.config.mts`)
- [x] vite proxy `/api` → `http://localhost:3000`
- [x] 검증: `pnpm nx run-many -t build test typecheck -p web`, `AppLayout` 테스트(메뉴 표시, 현재 경로 선택, 메뉴 클릭 이동)

### T5. ESLint 규칙

- 근거: design/backend.md 7장, design/frontend.md 7장, ADR-0001, ADR-0004
- [x] 루트(`eslint.config.mjs`): Nx tag 경계(`scope:api`, `scope:web`, `scope:shared`), `any` 금지, 함수 길이 50줄 경고. 타입 기반 규칙(`no-floating-promises`, `no-misused-promises`)은 앱에서 켠다
- [x] api(`apps/api/eslint.config.mjs`): DDD 방향, Symbol DI·Inject 데코레이터 금지, infrastructure의 `deleteOne`/`deleteMany`/`findOneAndDelete`/`findByIdAndDelete`/`remove` 금지
- [x] web(`apps/web/eslint.config.mjs`): FSD 레이어 방향, slice 내부 파일 직접 import 금지
- [x] 검증: `pnpm lint`. 규칙마다 위반 파일을 임시로 만들어 에러가 나는지 확인

### T6. dependency-cruiser

- 근거: design/backend.md 7장, design/frontend.md 7장
- [x] `.dependency-cruiser.cjs`: DDD 경계, FSD 레이어 방향, 같은 레이어 slice 간 import 금지, slice 공개 API, 순환 참조, 고아 파일 경고
- [x] `tsconfig.depcruise.json`: `@/` 별칭
- [x] `package.json`에 `deps:check` 스크립트
- [x] 검증: `pnpm deps:check`. 규칙마다 위반 파일로 확인

### T7. 루트 스크립트, CI, README

- 근거: design/backend.md 2장
- [x] `package.json` 스크립트: `dev`, `build`, `test`, `lint`, `typecheck`, `deps:check`, `format`
- [x] `.github/workflows/ci.yml`에 `pnpm deps:check` 추가
- [x] `README.md` 실행 방법
- [x] 검증: 각 스크립트 실행

## 완료 기준

- [x] `pnpm lint`, `pnpm deps:check`, es-arch-check critical 0건
- [ ] 코드 리뷰
- `pnpm dev` 후 확인
  - [x] `http://localhost:3000/api/health`와 `http://localhost:4200/api/health`(프록시)가 `{"status":"ok"}`
  - [x] `/`는 `/labs`로 이동하고, 메뉴를 누르면 해당 경로로 바뀌며 선택 표시가 따라간다
  - [x] 없는 경로는 404 화면

## 결정 사항

- **tsc 출력은 `out-tsc/`**: `typecheck`(tsc --build)와 `build`(webpack, vite)가 모두 `dist/`를 쓰면 병렬 실행 시 서로의 출력을 지운다.
- **web 생성기는 `--minimal`**: `--useReactRouter`는 React Router SSR 프레임워크 모드(`app/` 디렉터리)로 만들어져 FSD와 맞지 않는다.
- **`tsconfig.depcruise.json`을 루트에 둔다**: dependency-cruiser가 tsconfig `paths`를 실행 위치 기준으로 풀어서, web tsconfig로는 `@/` 별칭을 찾지 못한다.
- **Symbol DI 정규식 보완**: ewoosoft ESLint 템플릿의 정규식은 대소문자를 구분해 `LAB_ORDER_REPOSITORY = Symbol(...)`을 놓친다. `_REPOSITORY`, `_GATEWAY`도 잡도록 고친다.
- **FSD 공개 API 규칙 재작성**: dependency-cruiser 템플릿의 규칙은 출발 slice를 구분하지 못한다. 출발 slice를 캡처해 같은 slice만 예외로 둔다.
- **ESLint 메시지에 `@Inject(` 문자열을 쓰지 않는다**: es-arch-check가 설정 파일의 메시지를 위반으로 오인한다.
- **TanStack Query, dayjs 플러그인은 M3에서 추가**: M1 화면은 데이터를 조회하지 않는다.
- **Nx tag 경계는 위반 확인을 미룬다**: 지금은 앱 두 개뿐이라 경계를 넘는 import를 만들 수 없다. 첫 lib를 만들 때 확인한다.
