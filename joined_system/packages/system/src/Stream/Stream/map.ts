import * as Chunk from "../../Chunk"
import type { Stream } from "./definitions"
import { mapChunks_ } from "./mapChunks"

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
