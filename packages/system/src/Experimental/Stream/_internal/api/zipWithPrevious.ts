// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as MapAccum from "./mapAccum"

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
