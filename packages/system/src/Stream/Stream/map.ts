// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Transforms the chunks emitted by this stream.
 */
export function map_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => O2
): Stream<R, E, O2> {
  return mapChunks_(self, Chunk.map(f))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function map<O, O2>(f: (_: O) => O2) {
  return <R, E>(self: Stream<R, E, O>): Stream<R, E, O2> => map_(self, f)
}
