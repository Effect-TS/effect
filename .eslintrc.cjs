/* eslint-disable no-undef */
module.exports = {
  ignorePatterns: ["build", "dist", "dtslint", "*.mjs", "docs", "*.md"],
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
    "plugin:@repo-tooling/dprint/recommended"
  ],
  plugins: ["deprecation", "import", "sort-destructure-keys", "simple-import-sort", "codegen"],
  rules: {
    "codegen/codegen": "error",
    "no-fallthrough": "off",
    "no-irregular-whitespace": "off",
    "object-shorthand": "error",
    "prefer-destructuring": "off",
    "sort-imports": "off",
    "no-unused-vars": "off",
    "prefer-rest-params": "off",
    "prefer-spread": "off",
    "import/first": "error",
    "import/no-cycle": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "import/no-unresolved": "off",
    "import/order": "off",
    "simple-import-sort/imports": "off",
    "sort-destructure-keys/sort-destructure-keys": "error",
    "deprecation/deprecation": "off",
    "@typescript-eslint/array-type": ["warn", { "default": "generic", "readonly": "generic" }],
    "@typescript-eslint/member-delimiter-style": 0,
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-array-constructor": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-namespace": "off",
    "@repo-tooling/dprint/dprint": [
      "error",
      {
        config: {
          "indentWidth": 2,
          "lineWidth": 120,
          "semiColons": "asi",
          "quoteStyle": "alwaysDouble",
          "trailingCommas": "never",
          "operatorPosition": "maintain",
          "arrowFunction.useParentheses": "force"
        }
      }
    ]
  }
}
