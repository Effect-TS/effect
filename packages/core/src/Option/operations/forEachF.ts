// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import { pipe } from "../../Function/index.js"
import { succeedF } from "../../Prelude/DSL/index.js"
import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"

export const forEachF = P.implementForEachF<OptionF>()(
  () => (G) => (f) => (fa) =>
    O.isNone(fa) ? succeedF(G)(O.none) : pipe(f(fa.value), G.map(O.some))
)
