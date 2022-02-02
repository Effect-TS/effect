// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(
  self: C.Stream<R, E, CK.Chunk<A>>
): C.Stream<R, E, A> {
  return new C.Stream(CH.mapOut_(self.channel, CK.flatten))
}
