// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import { succeedF } from "../../Prelude/DSL/index.js"
import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"

export const compactF = P.implementCompactF<OptionF>()((_) => (F) => (f) => (fa) => {
  return O.isNone(fa) ? succeedF(F)(O.none) : f(fa.value)
})
