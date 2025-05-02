module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: false,
            tsconfig: 'tsconfig.json',
            sourceMap: true,
            inlineSourceMap: false
        }],
    },
    testRegex: '(/__tests__/.*\\.test\\.(ts|js)x?)$',
    // Enable source maps
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    // Ensure source maps are properly loaded
    setupFiles: ['<rootDir>/jest.setup.js'],
    // Add these settings to ensure proper source map handling
    testEnvironmentOptions: {
        NODE_OPTIONS: '--enable-source-maps'
    }
};