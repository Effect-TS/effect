// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import type * as C from "../core"
import * as MapAccum from "./mapAccum"

/**
 * Zips this stream together with the index of elements.
 */
export function zipWithIndex<R, E, A>(
  self: C.Stream<R, E, A>
): C.Stream<R, E, Tp.Tuple<[A, number]>> {
  return MapAccum.mapAccum_(self, 0, (index, a) =>
    Tp.tuple(index + 1, Tp.tuple(a, index))
  )
}
