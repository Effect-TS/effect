// eslint-disable-next-line
module.exports = {
  rootDir: "./",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "packages/**/src/**/*.ts",
    "packages_be/**/src/**/*.ts",
    "packages_fe/**/src/**/*.ts",
    "packages_http/**/src/**/*.ts",
    "packages_inc/**/src/**/*.ts",
    "packages_sys/**/src/**/*.ts",
    "shaking/**/src/**/*.ts"
  ],
  setupFiles: ["./jest-setup.ts"],
  modulePathIgnorePatterns: ["dtslint", "build"],
  verbose: true
}
