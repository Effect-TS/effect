// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"
import * as O from "@effect-ts/system/Option"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as P from "../../PreludeV2/index.js"

export const separateF = P.implementSeparateF<OptionF>()((_) => (F) => (f) => (fa) => {
  const o = O.map_(fa, (a) =>
    pipe(
      f(a),
      F.map((e) => Tp.tuple(O.getLeft(e), O.getRight(e)))
    )
  )
  return O.isNone(o) ? P.succeedF(F, F)(Tp.tuple(O.none, O.none)) : o.value
})
