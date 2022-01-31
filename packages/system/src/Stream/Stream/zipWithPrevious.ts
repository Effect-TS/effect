// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { mapAccum_ } from "./mapAccum.js"

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
