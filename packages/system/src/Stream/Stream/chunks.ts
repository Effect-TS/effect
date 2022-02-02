import * as A from "../../Collections/Immutable/Chunk"
import type { Stream } from "./definitions"
import { mapChunks_ } from "./mapChunks"

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of elements
 */
export function chunks<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A.Chunk<A>> {
  return mapChunks_(self, A.single)
}
