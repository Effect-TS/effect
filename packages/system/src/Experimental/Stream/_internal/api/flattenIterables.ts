// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as FlattenChunks from "./flattenChunks.js"
import * as Map from "./map.js"

/**
 * Submerges the iterables carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenIterables<R, E, A>(
  self: C.Stream<R, E, Iterable<A>>
): C.Stream<R, E, A> {
  return FlattenChunks.flattenChunks(Map.map_(self, (a) => CK.from(a)))
}
