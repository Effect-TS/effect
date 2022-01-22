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
  setupFilesAfterEnv: ["<rootDir>/scripts/jest-setup-after-env.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/packages/.*/src",
    "<rootDir>/packages/.*/build",
    "<rootDir>/packages/.*/dist",
    "<rootDir>/packages/.*/compiler-debug",
    "<rootDir>/_tmp"
  ],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json"
    }
  }
}
