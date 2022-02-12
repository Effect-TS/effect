import { PrettierKonfik } from "@konfik-plugin/prettier"

export const prettier = PrettierKonfik({
  semi: false,
  trailingComma: "none",
  singleQuote: false,
  printWidth: 88,
  tabWidth: 2,
  endOfLine: "auto"
})
