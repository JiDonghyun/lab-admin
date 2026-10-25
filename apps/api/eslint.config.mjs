import baseConfig, { typedRules } from '../../eslint.config.mjs';

/**
 * api DDD 레이어 규칙 (docs/specs/spec-backend.md 3.3, 7장)
 *
 *   presentation ──> application ──> domain <── infrastructure
 */
const SPEC = 'docs/specs/spec-backend.md 3.3 참고';

// ADR-0001: DI 포트는 abstract class 로 선언한다 (~/.claude/templates/eslint/no-symbol-di.md)
const NO_SYMBOL_DI = [
  {
    selector: "Decorator[expression.callee.name='Inject']",
    message:
      'Inject 데코레이터 대신 abstract class 포트로 주입하세요. ADR-0001 참고.',
  },
  {
    selector:
      "VariableDeclarator[init.callee.name='Symbol'][id.name=/(_TOKEN|Token|_REPOSITORY|Repository|_GATEWAY|Gateway)$/]",
    message:
      'Symbol DI 토큰은 금지입니다. 포트를 abstract class 로 선언하세요. ADR-0001 참고.',
  },
];

// ADR-0004: 운영 DB 에서 문서를 지우지 않는다
const NO_DELETE = {
  selector:
    'CallExpression[callee.property.name=/^(deleteOne|deleteMany|findOneAndDelete|findByIdAndDelete|remove)$/]',
  message: '운영 DB 문서 삭제는 금지입니다. ADR-0004 참고.',
};

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...typedRules,
      'no-restricted-syntax': ['error', ...NO_SYMBOL_DI],
    },
  },
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/application/**',
                '**/infrastructure/**',
                '**/presentation/**',
              ],
              message: `domain 은 다른 레이어를 import 할 수 없습니다. ${SPEC}`,
            },
            {
              group: ['@nestjs/*', 'mongoose'],
              message: `domain 은 순수 TypeScript 로 작성합니다. ${SPEC}`,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/presentation/**'],
              message: `application 은 domain 의 포트로만 접근합니다. ${SPEC}`,
            },
            {
              group: ['mongoose', '@nestjs/mongoose'],
              message: `application 은 mongoose 를 직접 쓸 수 없습니다. ${SPEC}`,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/presentation/**'],
              message: `infrastructure 는 presentation 을 import 할 수 없습니다. ${SPEC}`,
            },
          ],
        },
      ],
      // 위 블록의 no-restricted-syntax 를 덮어쓰므로 Symbol DI 규칙도 함께 넣는다.
      'no-restricted-syntax': ['error', ...NO_SYMBOL_DI, NO_DELETE],
    },
  },
  {
    files: ['src/**/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message: `presentation 은 infrastructure 를 직접 쓸 수 없습니다. ${SPEC}`,
            },
          ],
        },
      ],
    },
  },
];
