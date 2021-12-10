// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as O from "../../../../Option"
import type * as C from "../core"
import * as MapChunks from "./mapChunks"

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, A, B>(
  self: C.Stream<R, E, A>,
  f: (a: A) => O.Option<B>
): C.Stream<R, E, B> {
  return MapChunks.mapChunks_(self, CK.collectChunk(f))
}

/**
 * Performs a filter and map in a single step.
 *
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => O.Option<B>) {
  return <R, E>(self: C.Stream<R, E, A>) => collect_(self, f)
}
