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
    "@effect-ts/jest/(.*)$": "<rootDir>/packages/jest/build/$1",
    "@effect-ts/jest$": "<rootDir>/packages/jest/build",
    "@effect-ts/morphic/(.*)$": "<rootDir>/packages/morphic/build/$1",
    "@effect-ts/morphic$": "<rootDir>/packages/morphic/build",
    "@effect-ts/monocle/(.*)$": "<rootDir>/packages/monocle/build/$1",
    "@effect-ts/monocle$": "<rootDir>/packages/monocle/build",
    "@effect-ts/system/(.*)$": "<rootDir>/packages/system/build/$1",
    "@effect-ts/system$": "<rootDir>/packages/system/build",
    "@effect-ts/core/(.*)$": "<rootDir>/packages/core/build/$1",
    "@effect-ts/core$": "<rootDir>/packages/core/build"
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      compiler: "ttypescript"
    }
  }
}
