// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as Map from "./map"
import * as ZipWithNext from "./zipWithNext"
import * as ZipWithPrevious from "./zipWithPrevious"

/**
 * Zips each element with both the previous and next element.
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: C.Stream<R, E, A>
): C.Stream<R, E, Tp.Tuple<[O.Option<A>, A, O.Option<A>]>> {
  return Map.map_(
    ZipWithNext.zipWithNext(ZipWithPrevious.zipWithPrevious(self)),
    ({
      tuple: [
        {
          tuple: [prev, curr]
        },
        next
      ]
    }) => Tp.tuple(prev, curr, O.map_(next, Tp.get(1)))
  )
}
