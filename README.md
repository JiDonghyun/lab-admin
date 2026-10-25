# Clever Lab Admin

clever-lab-api 운영 데이터(기공소, 의뢰서, 거래 명세서, 회계)를 조회하는 백오피스 어드민입니다. Nx 모노레포로 구성합니다.

- `apps/api`: NestJS (DDD), webpack 빌드
- `apps/web`: React + Vite + Ant Design (FSD)

요구사항은 [docs/prd.md](docs/prd.md), 구조와 규칙은 [docs/specs](docs/specs), 결정 기록은 [docs/adr](docs/adr)를 참고하세요.

## 준비

- Node 24, pnpm 11

```bash
pnpm install
```

## 실행

```bash
pnpm dev    # api(3000) + web(4200). web 의 /api 요청은 api 로 프록시된다
```

- API: http://localhost:3000/api/health
- 웹: http://localhost:4200

## 명령

| 명령                                         | 내용                                           |
| -------------------------------------------- | ---------------------------------------------- |
| `pnpm build` / `test` / `lint` / `typecheck` | 모든 프로젝트에 대해 Nx 타깃 실행              |
| `pnpm deps:check`                            | dependency-cruiser 레이어 경계 검사 (DDD, FSD) |
| `pnpm format`                                | Prettier                                       |
| `pnpm nx affected -t lint test build`        | 변경된 프로젝트만 실행                         |
| `node ~/.claude/scripts/es-arch-check.mjs`   | ewoosoft 아키텍처 검사 (critical 0건 유지)     |
