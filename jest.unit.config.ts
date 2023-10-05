module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: './coverage',
  // we just have unit tests for services
  collectCoverageFrom: ['src/services/**/*.ts', '!src/services/**/index.ts'],
  coveragePathIgnorePatterns: ['src/index.ts', 'src/lambda.ts', 'src/lambda.test.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
