// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as DSL from "../../PreludeV2/DSL/index.js"
import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"

export const separateF = P.implementSeparateF<OptionF>()((_) => (F) => (f) => (fa) => {
  const o = O.map_(fa, (a) =>
    pipe(
      f(a),
      F.map((e) => Tp.tuple(O.getLeft(e), O.getRight(e)))
    )
  )
  return O.isNone(o) ? DSL.succeedF(F)(Tp.tuple(O.none, O.none)) : o.value
})
