import nx from '@nx/eslint-plugin';
import baseConfig, { typedRules } from '../../eslint.config.mjs';

/**
 * web FSD 레이어 규칙 (docs/specs/spec-frontend.md 3.3, ADR-0005)
 *
 *   app > pages > widgets > features > entities > shared
 *
 * 1. 하위 레이어는 상위 레이어를 import 하지 않는다.
 * 2. slice 밖에서는 public API(index.ts)로만 import 한다.
 * 3. 같은 레이어의 다른 slice 는 import 하지 않는다. (.dependency-cruiser.cjs 에서 검사)
 */
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];

const layerRule = (layer) => {
  const upper = LAYERS.slice(0, LAYERS.indexOf(layer));
  const patterns = [
    {
      group: SLICED_LAYERS.map((l) => `@/${l}/*/**`),
      message:
        'FSD: slice 내부 파일 대신 public API(index.ts)를 import 하세요.',
    },
  ];
  if (upper.length > 0) {
    patterns.push({
      group: upper.flatMap((l) => [`@/${l}`, `@/${l}/**`, `**/${l}/**`]),
      message: `FSD: ${layer} 는 상위 레이어(${upper.join(', ')})를 import 할 수 없습니다.`,
    });
  }
  return {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: { 'no-restricted-imports': ['error', { patterns }] },
  };
};

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: typedRules,
  },
  ...LAYERS.map(layerRule),
];
