// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["packages/**/src/**/*.ts"],
  setupFiles: ["./scripts/jest-setup.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/packages/.*/build",
    "<rootDir>/packages/.*/compiler-debug",
    "<rootDir>/_tmp"
  ],
  verbose: true,
  moduleNameMapper: {
    "@effect-ts/core/(.*)$": "<rootDir>/packages/core/src/$1",
    "@effect-ts/core$": "<rootDir>/packages/core/src",
    "@effect-ts/system/(.*)$": "<rootDir>/packages/system/src/$1",
    "@effect-ts/system$": "<rootDir>/packages/system/src",
    "@effect-ts/tracing-utils/(.*)$": "<rootDir>/packages/tracing-utils/src/$1",
    "@effect-ts/tracing-utils$": "<rootDir>/packages/tracing-utils/src"
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      compiler: "ttypescript"
    }
  }
}
