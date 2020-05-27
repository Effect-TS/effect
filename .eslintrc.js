/* eslint-disable no-undef */
module.exports = {
  ignorePatterns: ["dtslint/", "lib/", "es6/", "build/", "bench/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    "plugin:prettier/recommended" // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ["import", "sort-destructure-keys"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-empty-interface": [
      "error",
      {
        allowSingleExtends: true
      }
    ],
    "@typescript-eslint/camelcase": "off",
    "sort-destructure-keys/sort-destructure-keys": "error",
    "import/no-unresolved": "error",
    "no-irregular-whitespace": "off",
    "import/order": [
      "error",
      {
        "newlines-between": "always",
        pathGroups: [{ pattern: "@/**", group: "external", position: "after" }],
        alphabetize: { order: "asc" },
        groups: ["builtin", "external", "parent", "sibling", "index"]
      }
    ],
    "object-shorthand": "error",
    "prefer-destructuring": "off"
  }
}
