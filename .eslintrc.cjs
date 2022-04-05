/* eslint-disable no-undef */
module.exports = {
  ignorePatterns: ["build", "dist"],
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
    "plugin:@phaphoso/dprint/recommended"
  ],
  plugins: ["import", "sort-destructure-keys", "simple-import-sort", "codegen"],
  rules: {
    "@phaphoso/dprint/dprint": [
      "error",
      {
        config: {
          // The TypeScript configuration of dprint
          // See also https://dprint.dev/plugins/typescript/config/,
          "indentWidth": 2,
          "semiColons": "always",
          "quoteStyle": "alwaysDouble",
          "trailingCommas": "never",
          "operatorPosition": "maintain",
          "useParentheses": "preferNone"
        }
      }
    ],
    "codegen/codegen": "error",
    "no-fallthrough": "off",
    "no-irregular-whitespace": "off",
    "object-shorthand": "error",
    "prefer-destructuring": "off",
    "sort-imports": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-array-constructor": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "import/first": "error",
    "import/no-cycle": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "import/no-unresolved": "off",
    "import/order": "off",
    "simple-import-sort/imports": "error",
    "sort-destructure-keys/sort-destructure-keys": "error"
  }
};
