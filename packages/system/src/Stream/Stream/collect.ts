// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { mapChunks_ } from "./mapChunks"

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, O, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => O.Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(self, A.collectChunk(f))
}

/**
 * Performs a filter and map in a single step.
 */
export function collect<O, O1>(f: (o: O) => O.Option<O1>) {
  return <R, E>(self: Stream<R, E, O>) => collect_(self, f)
}
