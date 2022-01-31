// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Stream } from "./definitions.js"
import { mapAccum_ } from "./mapAccum.js"

/**
 * Zips this stream together with the index of elements.
 */
export function zipWithIndex<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, Tp.Tuple<[O, number]>> {
  return mapAccum_(self, 0, (index, a: O) => Tp.tuple(index + 1, Tp.tuple(a, index)))
}
