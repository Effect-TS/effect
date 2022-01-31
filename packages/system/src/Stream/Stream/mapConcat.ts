// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => Iterable<O2>
): Stream<R, E, O2> {
  return mapChunks_(self, (o) => A.chain_(o, (o) => A.from(f(o))))
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat<O, O2>(f: (_: O) => Iterable<O2>) {
  return <R, E>(self: Stream<R, E, O>) => mapConcat_(self, f)
}
