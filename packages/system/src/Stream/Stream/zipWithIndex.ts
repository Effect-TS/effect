// tracing: off

import type { Stream } from "./definitions"
import { mapAccum } from "./mapAccum"

/**
 * Zips this stream together with the index of elements.
 */
export function zipWithIndex<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, readonly [O, number]> {
  return mapAccum(0)((index, a: O) => [index + 1, [a, index] as const])(self)
}
