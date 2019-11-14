module.exports = {
  rootDir: "./",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.test.json",
      diagnostics: true
    }
  },
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleDirectories: ["<rootDir>/node_modules/"],
  modulePathIgnorePatterns: ["<rootDir>/lib/"]
};
