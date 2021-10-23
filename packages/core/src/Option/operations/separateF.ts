// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import { pipe } from "../../Function"
import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const separateF = P.implementSeparateF<[P.URI<OptionURI>]>()(
  (_) => (F) => (f) => (fa) => {
    const o = O.map_(fa, (a) =>
      pipe(
        f(a),
        F.map((e) => ({
          left: O.getLeft(e),
          right: O.getRight(e)
        }))
      )
    )
    return O.isNone(o)
      ? P.succeedF(F)({
          left: O.none,
          right: O.none
        })
      : o.value
  }
)
