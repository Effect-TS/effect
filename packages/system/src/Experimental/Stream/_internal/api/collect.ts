// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as MapChunks from "./mapChunks.js"

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, A, B>(
  self: C.Stream<R, E, A>,
  f: (a: A) => O.Option<B>
): C.Stream<R, E, B> {
  return MapChunks.mapChunks_(self, CK.collect(f))
}

/**
 * Performs a filter and map in a single step.
 *
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => O.Option<B>) {
  return <R, E>(self: C.Stream<R, E, A>) => collect_(self, f)
}
