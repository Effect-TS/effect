// ets_tracing: off

import type { Stream } from "./definitions.js"
import { zipWith_ } from "./zipWith.js"

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
): Stream<R & R1, E | E1, O> {
  return zipWith_(self, that, (o) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft<R1, E1, O2>(that: Stream<R1, E1, O2>) {
  return <R, E, O>(self: Stream<R, E, O>) => zipLeft_(self, that)
}
