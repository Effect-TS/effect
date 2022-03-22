// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"
import * as O from "@effect-ts/system/Option"

import * as P from "../../PreludeV2/index.js"

export const compactF = P.implementCompactF<OptionF>()((_) => (F) => (f) => (fa) => {
  return O.isNone(fa) ? P.succeedF(F, F)(O.none) : f(fa.value)
})
