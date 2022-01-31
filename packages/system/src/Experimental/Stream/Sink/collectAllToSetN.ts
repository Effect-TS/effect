// ets_tracing: off

import * as HS from "../../../Collections/Immutable/HashSet/index.js"
import type * as C from "./core.js"
import * as FoldWeighted from "./foldWeighted.js"

/**
 * A sink that collects first `n` distinct inputs into a set.
 */
export function collectAllToSetN<Err, In>(
  n: number
): C.Sink<unknown, Err, In, Err, In, HS.HashSet<In>> {
  return FoldWeighted.foldWeighted<Err, In, HS.HashSet<In>>(
    HS.make(),
    (acc, in_) => (HS.has_(acc, in_) ? 0 : 1),
    n,
    (s, a) => HS.add_(s, a)
  )
}
