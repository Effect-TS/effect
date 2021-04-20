// tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapAccum_ } from "./mapAccum"

/**
 * Zips each element with the previous element. Initially accompanied by `None`.
 */
export function zipWithPrevious<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, Tp.Tuple<[O.Option<O>, O]>> {
  return mapAccum_(self, O.none as O.Option<O>, (prev, next) =>
    Tp.tuple(O.some(next), Tp.tuple(prev, next))
  )
}
