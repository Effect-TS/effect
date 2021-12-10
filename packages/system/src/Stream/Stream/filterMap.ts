// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapChunks_ } from "./mapChunks"

/**
 * Performs a filter and map in a single step.
 */
export function filterMap_<R, E, O, O1>(
  self: Stream<R, E, O>,
  pf: (o: O) => O.Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(self, A.collectChunk(pf))
}

/**
 * Performs a filter and map in a single step.
 */
export function filterMap<O, O1>(pf: (o: O) => O.Option<O1>) {
  return <R, E>(self: Stream<R, E, O>) => filterMap_(self, pf)
}
