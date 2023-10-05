module.exports = {
  testMatch: ["**/?(*.)+(spec|test).integration.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  testEnvironment: 'node',
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testTimeout: 30000, // lets make it 30s since we are using real AWS resources (dynamo, cognito, etc)
};

