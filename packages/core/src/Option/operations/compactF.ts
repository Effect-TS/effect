// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"
import * as O from "@effect-ts/system/Option"

import { succeedF } from "../../PreludeV2/DSL/index.js"
import * as P from "../../PreludeV2/index.js"

export const compactF = P.implementCompactF<OptionF>()((_) => (F) => (f) => (fa) => {
  return O.isNone(fa) ? succeedF(F)(O.none) : f(fa.value)
})
