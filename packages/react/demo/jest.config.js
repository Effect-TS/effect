const mapper = require("jest-module-name-mapper").default

module.exports = {
  roots: ["<rootDir>"],
  moduleFileExtensions: ["js", "ts", "tsx", "json"],
  testPathIgnorePatterns: ["<rootDir>[/\\\\](node_modules|.next)[/\\\\]"],
  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|ts|tsx)$"],
  transform: {
    "^.+\\.(js|ts|tsx)$": "babel-jest"
  },
  watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
  moduleNameMapper: mapper("tsconfig.json"),
  setupFilesAfterEnv: ["./jest.setup.js"]
}
