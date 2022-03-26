// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"
import * as O from "@effect-ts/system/Option"

import { pipe } from "../../Function/index.js"
import { succeedF } from "../../PreludeV2/DSL/index.js"
import * as P from "../../PreludeV2/index.js"

export const forEachF = P.implementForEachF<OptionF>()(
  () => (G) => (f) => (fa) =>
    O.isNone(fa) ? succeedF(G)(O.none) : pipe(f(fa.value), G.map(O.some))
)
