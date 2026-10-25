# Clever Lab Admin

clever-lab-api 운영 데이터를 조회하는 백오피스 어드민. Nx 모노레포 (`apps/api` NestJS, `apps/web` React).

## 문서 (SDD)

| 문서 | 내용 |
| --- | --- |
| `docs/spec.md` | 요구사항과 수용 기준. 요구사항 ID(`AUTH-01` 등)로 참조한다 |
| `docs/design/backend.md`, `docs/design/frontend.md` | 구조와 레이어 규칙 |
| `docs/adr/` | 아키텍처 결정 기록 |
| `docs/plan.md` | 기술 스택, Phase와 마일스톤 |
| `docs/tasks/` | 마일스톤별 작업, 요구사항 ID, 완료 조건 체크리스트 (형식은 `docs/tasks/README.md`) |

## 작업 규칙

- 구현 전에 해당 마일스톤의 `docs/tasks/Mx-*.md`를 읽는다. 없거나 상태가 `Approved`가 아니면 구현하지 말고 tasks 문서를 먼저 작성해 승인을 받는다.
- 문서와 다르게 구현해야 하면 코드보다 문서를 먼저 고치고 알린다. 요구사항은 spec.md, 설계는 design 또는 ADR, 작업은 tasks 문서.
- `[NEEDS CLARIFICATION]`이 붙은 요구사항은 구현하지 않는다.
- 테스트 이름에 검증하는 요구사항 ID를 넣는다.
- 작업을 마치면 `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm deps:check`, `node ~/.claude/scripts/es-arch-check.mjs`를 통과시키고 tasks 문서에서 끝난 항목과 요구사항 ID를 체크한다. 마일스톤이 끝나면 plan.md 3장의 상태를 고친다.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
