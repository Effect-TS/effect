import "@effect-ts/tracing-utils/Enable"

import { alias } from "../Alias"

alias({
  "@effect-ts/system": "@effect-ts/system/_traced",
  "@effect-ts/core": "@effect-ts/core/_traced",
  "@effect-ts/monocle": "@effect-ts/monocle/_traced",
  "@effect-ts/morphic": "@effect-ts/morphic/_traced",
  "@effect-ts/jest": "@effect-ts/jest/_traced",
  "@effect-ts/node": "@effect-ts/node/_traced"
})
