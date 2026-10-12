# M1. 모노레포, 공통 레이아웃

- 상태: Draft
- Phase: 1. 기반
- 요구사항: 없음 (기반 작업)
- 설계: design/backend.md 2장, 3장, 7장 / design/frontend.md 3.1~3.3, 7장 / ADR-0001, ADR-0005

> 이 문서보다 구현이 먼저 진행됐다 (`git stash` `m1`). 문서를 승인한 뒤 stash한 구현을 이 문서 기준으로 검토하고 반영한다.

## 목표

`pnpm dev`로 api(3000)와 web(4200)을 띄우면 빈 메뉴가 있는 레이아웃이 나오고, 레이어 규칙 검사가 CI에서 돈다.

## 작업

- [ ] T1. 패키지 스코프와 workspace 설정
  - 파일: `package.json`(`@lab-admin/source`), `tsconfig.base.json`(`customConditions`), `pnpm-workspace.yaml`(`apps/*` 추가, `allowBuilds`)
  - 근거: plan.md 2.1
  - 검증: `pnpm install`이 경고 없이 끝난다

- [ ] T2. Nx 플러그인 추가
  - 파일: `nx.json`, `package.json`
  - 내용: `@nx/nest`, `@nx/webpack`, `@nx/jest`, `@nx/react`, `@nx/vite`, `@nx/vitest`, `@nx/eslint` (23.2.0)
  - 근거: design/backend.md 2장
  - 검증: `pnpm nx list`에 플러그인이 보인다

- [ ] T3. `apps/api` 생성
  - 파일: `apps/api/**`
  - 내용
    - `nx g @nx/nest:app apps/api --tags=scope:api --unitTestRunner=jest --e2eTestRunner=none --enableTypedLinting --useProjectJson --strict`
    - `AppModule`을 `src/app.module.ts`로 옮기고 생성기 예제(`src/app/`)를 지운다
    - `src/app.setup.ts`: `/api` prefix
    - `src/shared/presentation/health.controller.ts`: `GET /api/health`
    - 테스트를 `@swc/jest`에서 ts-jest로 바꾼다. `tsconfig.spec.json`에 `rootDir` (TS 6 요구사항)
  - 근거: design/backend.md 3장
  - 검증: `pnpm nx run-many -t build test typecheck -p api`

- [ ] T4. `apps/web` 생성과 레이아웃
  - 파일: `apps/web/**`
  - 내용
    - `nx g @nx/react:app apps/web --bundler=vite --minimal --port=4200 --tags=scope:web --unitTestRunner=vitest --e2eTestRunner=none --enableTypedLinting --useProjectJson`
    - antd 6, React Router 8 추가
    - FSD 구조: `app`(Provider, 라우터), `widgets/app-layout`(사이드 메뉴 5개 + 헤더), `pages/coming-soon`(메뉴별 자리표시자), `pages/not-found`, `shared/config`(라우트 경로 상수)
    - `@/` 별칭 (`tsconfig.app.json`, `tsconfig.spec.json`, `vite.config.mts`)
    - vite proxy `/api` → `http://localhost:3000`
  - 근거: design/frontend.md 3.1, 3.2, 3.5
  - 검증: `pnpm nx run-many -t build test typecheck -p web`. `AppLayout` 테스트(메뉴 표시, 현재 경로 선택)

- [ ] T5. ESLint 규칙
  - 파일: `eslint.config.mjs`, `apps/api/eslint.config.mjs`, `apps/web/eslint.config.mjs`
  - 내용
    - 루트: Nx tag 경계(`scope:api`, `scope:web`, `scope:shared`), `any` 금지, 함수 길이 50줄 경고. 타입 기반 규칙(`no-floating-promises`, `no-misused-promises`)은 앱에서 켠다
    - api: DDD 방향, Symbol DI·`@Inject` 금지, infrastructure의 `deleteOne`/`deleteMany`/`findOneAndDelete`/`findByIdAndDelete`/`remove` 금지
    - web: FSD 레이어 방향, slice 내부 파일 직접 import 금지
  - 근거: design/backend.md 7장, design/frontend.md 7장, ADR-0001, ADR-0004
  - 검증: `pnpm lint`. 규칙마다 위반 파일을 임시로 만들어 에러가 나는지 확인

- [ ] T6. dependency-cruiser
  - 파일: `.dependency-cruiser.cjs`, `tsconfig.depcruise.json`, `package.json`(`deps:check`)
  - 내용: DDD 경계, FSD 레이어 방향, 같은 레이어 slice 간 import 금지, slice 공개 API, 순환 참조, 고아 파일 경고
  - 근거: design/backend.md 7장, design/frontend.md 7장
  - 검증: `pnpm deps:check`. 규칙마다 위반 파일로 확인

- [ ] T7. 루트 스크립트, CI, README
  - 파일: `package.json`, `.github/workflows/ci.yml`(`pnpm deps:check` 추가), `README.md`
  - 내용: `dev`, `build`, `test`, `lint`, `typecheck`, `deps:check`, `format`
  - 근거: design/backend.md 2장
  - 검증: 각 스크립트 실행

## 완료 기준

- plan.md 5장 공통 기준 (`pnpm lint`, `pnpm deps:check`, es-arch-check critical 0건, 코드 리뷰)
- `pnpm dev` 후 확인
  - `http://localhost:3000/api/health`와 `http://localhost:4200/api/health`(프록시)가 `{"status":"ok"}`
  - `/`는 `/labs`로 이동하고, 메뉴를 누르면 해당 경로로 바뀌며 선택 표시가 따라간다
  - 없는 경로는 404 화면

## 결정 사항

- **tsc 출력은 `out-tsc/`**: `typecheck`(tsc --build)와 `build`(webpack, vite)가 모두 `dist/`를 쓰면 병렬 실행 시 서로의 출력을 지운다.
- **web 생성기는 `--minimal`**: `--useReactRouter`는 React Router SSR 프레임워크 모드(`app/` 디렉터리)로 만들어져 FSD와 맞지 않는다.
- **`tsconfig.depcruise.json`을 루트에 둔다**: dependency-cruiser가 tsconfig `paths`를 실행 위치 기준으로 풀어서, web tsconfig로는 `@/` 별칭을 찾지 못한다.
- **Symbol DI 정규식 보완**: ewoosoft ESLint 템플릿의 정규식은 대소문자를 구분해 `LAB_ORDER_REPOSITORY = Symbol(...)`을 놓친다. `_REPOSITORY`, `_GATEWAY`도 잡도록 고친다.
- **FSD 공개 API 규칙 재작성**: dependency-cruiser 템플릿의 규칙은 출발 slice를 구분하지 못한다. 출발 slice를 캡처해 같은 slice만 예외로 둔다.
- **ESLint 메시지에 `@Inject(` 문자열을 쓰지 않는다**: es-arch-check가 설정 파일의 메시지를 위반으로 오인한다.
- **TanStack Query, dayjs 플러그인은 M3에서 추가**: M1 화면은 데이터를 조회하지 않는다.
