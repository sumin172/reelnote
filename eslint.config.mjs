// Root ESLint configuration
// Reuses the shared TypeScript/JavaScript configuration from tools/ts
import sharedConfig from './tools/ts/eslint.config.mjs';

export default [
    ...sharedConfig,
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.nx/**',
            'coverage/**',
        ],
    },
];
