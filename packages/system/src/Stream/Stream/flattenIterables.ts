// ets_tracing: off
import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { flattenChunks } from "./flattenChunks.js"
import { map_ } from "./map.js"

/**
 * Submerges the iterables carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenIterables<R, E, O1>(
  self: Stream<R, E, Iterable<O1>>
): Stream<R, E, O1> {
  return flattenChunks(map_(self, A.from))
}
