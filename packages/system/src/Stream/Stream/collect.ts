// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, O, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => O.Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(self, A.collect(f))
}

/**
 * Performs a filter and map in a single step.
 */
export function collect<O, O1>(f: (o: O) => O.Option<O1>) {
  return <R, E>(self: Stream<R, E, O>) => collect_(self, f)
}
