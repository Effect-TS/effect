// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"

export const separateF = P.implementSeparateF<[P.URI<OptionURI>]>()(
  (_) => (F) => (f) => (fa) => {
    const o = O.map_(fa, (a) =>
      pipe(
        f(a),
        F.map((e) => Tp.tuple(O.getLeft(e), O.getRight(e)))
      )
    )
    return O.isNone(o) ? P.succeedF(F)(Tp.tuple(O.none, O.none)) : o.value
  }
)
