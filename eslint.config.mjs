// Root ESLint configuration
// Reuses the shared TypeScript/JavaScript configuration
import baseConfig from './eslint.base.config.mjs';

export default [
    ...baseConfig,
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.nx/**',
            'coverage/**',
        ],
    },
    {
        files: ['tests/**/*.{ts,tsx,js,jsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '../reelnote-frontend/**',
                                '../../reelnote-frontend/**',
                                '../reelnote-api/**',
                                '../../reelnote-api/**',
                                'reelnote-frontend/**',
                                'reelnote-api/**',
                                'apps/**'
                            ],
                            message: 'E2E 테스트에서는 앱 코드를 직접 import 할 수 없습니다.'
                        }
                    ]
                }
            ]
        }
    }
];
