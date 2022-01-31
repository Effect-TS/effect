// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as MapAccum from "./mapAccum.js"

/**
 * Zips each element with the previous element. Initially accompanied by `None`.
 */
export function zipWithPrevious<R, E, A>(
  self: C.Stream<R, E, A>
): C.Stream<R, E, Tp.Tuple<[O.Option<A>, A]>> {
  return MapAccum.mapAccum_(self, O.emptyOf<A>(), (prev, next) =>
    Tp.tuple(O.some(next), Tp.tuple(prev, next))
  )
}
