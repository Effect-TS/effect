import "@effect-ts/tracing-utils/Enable"

import { alias } from "./alias"

alias({
  "@effect-ts/system": "@effect-ts/system/_traced",
  "@effect-ts/core": "@effect-ts/core/_traced"
})
