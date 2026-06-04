/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: false,
            tsconfig: 'tsconfig.jest.json',
            sourceMap: true,
            inlineSourceMap: false
        }],
    },
    testRegex: '(/__tests__/.*\\.test\\.(ts|js)x?)$',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^#common/(.*)\\.js$': '<rootDir>/src/common/$1',
        '^#server/(.*)\\.js$': '<rootDir>/src/server/$1',
        '^#client/(.*)\\.js$': '<rootDir>/src/client/$1'
    },
    setupFiles: ['<rootDir>/jest.setup.cjs'],
    testEnvironmentOptions: {
        NODE_OPTIONS: '--enable-source-maps'
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/.stversions/',
        '/.stfolder/'
    ]
};
