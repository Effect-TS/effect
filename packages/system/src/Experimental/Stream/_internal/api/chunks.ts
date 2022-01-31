// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as MapChunks from "./mapChunks.js"

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of elements
 */
export function chunks<R, E, A>(self: C.Stream<R, E, A>): C.Stream<R, E, CK.Chunk<A>> {
  return MapChunks.mapChunks_(self, CK.single)
}
