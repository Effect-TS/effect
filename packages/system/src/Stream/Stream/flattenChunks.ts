import type * as Chunk from "../../Array/core"
import * as M from "../_internal/managed"
import * as BP from "../BufferedPull"
import { Stream } from "./definitions"

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, O>(
  self: Stream<R, E, Chunk.Array<O>>
): Stream<R, E, O> {
  return new Stream(M.map_(M.mapM_(self.proc, BP.make), BP.pullElement))
}
