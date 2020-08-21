// eslint-disable-next-line
module.exports = {
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["packages/**/src/**/*.ts"],
  setupFiles: ["./jest-setup.ts"],
  modulePathIgnorePatterns: ["dtslint", "build", "demo"],
  verbose: false,
  moduleNameMapper: {
    "@effect-ts/system/(.*)$": "<rootDir>/packages/system/build/$1",
    "@effect-ts/system$": "<rootDir>/packages/system/build",
    "@effect-ts/core/(.*)$": "<rootDir>/packages/core/build/$1",
    "@effect-ts/core$": "<rootDir>/packages/core/build"
  }
}
