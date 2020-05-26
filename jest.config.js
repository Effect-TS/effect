// eslint-disable-next-line
module.exports = {
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "packages/**/src/**/*.ts",
    "packages_be/**/src/**/*.ts",
    "packages_fe/**/src/**/*.ts",
    "packages_http/**/src/**/*.ts",
    "packages_inc/**/src/**/*.ts",
    "packages_sys/**/src/**/*.ts"
  ],
  setupFiles: ["./jest-setup.ts"],
  modulePathIgnorePatterns: ["dtslint", "build"],
  verbose: false,
  moduleNameMapper: {
    "@matechs/core/(.*)$": "<rootDir>/packages/core/build/$1",
    "@matechs/core$": "<rootDir>/packages/core/build",
    "@matechs/contrib/(.*)$": "<rootDir>/packages/contrib/build",
    "@matechs/contrib$": "<rootDir>/packages/contrib/build/$1",
    "@matechs/test/(.*)$": "<rootDir>/packages/test/build/$1",
    "@matechs/test$": "<rootDir>/packages/test/build",
    "@matechs/test-jest/(.*)$": "<rootDir>/packages/test-jest/build/$1",
    "@matechs/test-jest$": "<rootDir>/packages/test-jest/build"
  }
}
