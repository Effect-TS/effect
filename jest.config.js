module.exports = {
  rootDir: "./",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [ "packages/**/src/**/*.ts"],
  setupFiles: ["./jest-setup.ts"],
  verbose: true
};

