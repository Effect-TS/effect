// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 */
export function drain<R, E, O>(self: Stream<R, E, O>): Stream<R, E, never> {
  return mapChunks_(self, (_) => A.empty())
}
