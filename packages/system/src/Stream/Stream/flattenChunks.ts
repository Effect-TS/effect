// ets_tracing: off

import type * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as M from "../_internal/managed.js"
import * as BP from "../BufferedPull/index.js"
import { Stream } from "./definitions.js"

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, O>(
  self: Stream<R, E, Chunk.Chunk<O>>
): Stream<R, E, O> {
  return new Stream(M.map_(M.mapM_(self.proc, BP.make), BP.pullElement))
}
