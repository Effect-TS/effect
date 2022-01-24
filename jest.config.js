// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["packages/**/src/**/*.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/packages/.*/src",
    "<rootDir>/packages/.*/build"
  ],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json"
    }
  }
}
