// 앱 내부 레이어 경계 검사. ~/.claude/templates/dependency-cruiser/ddd-fsd.md 를 바탕으로
// 경로를 apps/api, apps/web 으로 좁히고, FSD 같은 레이어 slice 간 import 금지를 추가했다.
// 근거: docs/specs/spec-backend.md 7장, docs/specs/spec-frontend.md 7장
const API = '^apps/api/src/';
const WEB = '^apps/web/src/';
const SLICED = '(pages|widgets|features|entities)';
const SLICE_INTERNAL = `${WEB}${SLICED}/[^/]+/(?!index\\.tsx?$).+`;

const fsdNoUpward = (layer, upper) => ({
  name: `fsd-${layer}-no-upward`,
  severity: 'error',
  comment: `FSD: ${layer} 는 상위 레이어(${upper.join(', ')})를 import 할 수 없다.`,
  from: { path: `${WEB}${layer}/` },
  to: { path: `${WEB}(${upper.join('|')})/` },
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── DDD (apps/api) ──────────────────────────────────────────────────
    {
      name: 'ddd-domain-isolated',
      severity: 'error',
      comment: 'domain 은 다른 레이어를 import 하지 않는다.',
      from: { path: `${API}.*/domain/` },
      to: { path: '/(application|infrastructure|presentation)/' },
    },
    {
      name: 'ddd-application-via-ports',
      severity: 'error',
      comment:
        'application 은 infrastructure, presentation 을 import 하지 않는다.',
      from: { path: `${API}.*/application/` },
      to: { path: '/(infrastructure|presentation)/' },
    },
    {
      name: 'ddd-infrastructure-no-presentation',
      severity: 'error',
      comment: 'infrastructure 는 presentation 을 import 하지 않는다.',
      from: { path: `${API}.*/infrastructure/` },
      to: { path: '/presentation/' },
    },
    {
      name: 'ddd-presentation-no-infrastructure',
      severity: 'error',
      comment: 'presentation 은 infrastructure 를 직접 쓰지 않는다.',
      from: { path: `${API}.*/presentation/` },
      to: { path: '/infrastructure/' },
    },

    // ── FSD (apps/web): app > pages > widgets > features > entities > shared
    fsdNoUpward('pages', ['app']),
    fsdNoUpward('widgets', ['app', 'pages']),
    fsdNoUpward('features', ['app', 'pages', 'widgets']),
    fsdNoUpward('entities', ['app', 'pages', 'widgets', 'features']),
    fsdNoUpward('shared', ['app', 'pages', 'widgets', 'features', 'entities']),
    {
      name: 'fsd-no-cross-slice',
      severity: 'error',
      comment:
        'FSD: 같은 레이어의 다른 slice 는 import 하지 않는다. 조합은 상위 레이어에서 한다.',
      from: { path: `${WEB}${SLICED}/([^/]+)/` },
      to: { path: `${WEB}$1/(?!$2/)[^/]+/` },
    },
    {
      name: 'fsd-public-api',
      severity: 'error',
      comment: 'FSD: 다른 slice 는 index.ts 로만 import 한다.',
      from: { path: `${WEB}${SLICED}/([^/]+)/` },
      // 같은 slice($1/$2) 안의 import 는 허용한다.
      to: { path: SLICE_INTERNAL, pathNot: `${WEB}$1/$2/` },
    },
    {
      name: 'fsd-public-api-from-app-shared',
      severity: 'error',
      comment: 'FSD: 다른 slice 는 index.ts 로만 import 한다.',
      from: { path: WEB, pathNot: `${WEB}${SLICED}/` },
      to: { path: SLICE_INTERNAL },
    },

    // ── 공통 ────────────────────────────────────────────────────────────
    {
      name: 'no-circular',
      severity: 'error',
      comment: '순환 참조 금지',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: '어디서도 import 하지 않는 파일은 dead code 일 가능성이 높다.',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '\\.(spec|test)\\.tsx?$',
          '/main\\.tsx?$',
          '/test-setup\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    // web 의 @/ 별칭을 풀기 위한 설정. paths 를 실행 위치(루트) 기준으로 풀어서 루트에 따로 둔다.
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: [
        '@lab-admin/source',
        'import',
        'require',
        'node',
        'default',
      ],
    },
  },
};
