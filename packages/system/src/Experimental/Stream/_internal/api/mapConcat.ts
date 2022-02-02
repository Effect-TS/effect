// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as MapConcatChunk from "./mapConcatChunk.js"

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A) => Iterable<A1>
): C.Stream<R, E, A1> {
  return MapConcatChunk.mapConcatChunk_(self, (a) => CK.from(f(a)))
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 *
 * @ets_data_first mapConcat_
 */
export function mapConcat<A, A1>(f: (a: A) => Iterable<A1>) {
  return <R, E>(self: C.Stream<R, E, A>) => mapConcat_(self, f)
}
