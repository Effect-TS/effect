import "@effect-ts/tracing-utils/Enable"

import { alias } from "../Alias"

alias({
  "@effect-ts/system": "@effect-ts/system/_traced/esm",
  "@effect-ts/core": "@effect-ts/core/_traced/esm",
  "@effect-ts/monocle": "@effect-ts/monocle/_traced/esm",
  "@effect-ts/morphic": "@effect-ts/morphic/_traced/esm",
  "@effect-ts/jest": "@effect-ts/jest/_traced/esm",
  "@effect-ts/tracing-utils": "@effect-ts/tracing-utils/esm",
  "@effect-ts/node": "@effect-ts/node/_traced/esm"
})
