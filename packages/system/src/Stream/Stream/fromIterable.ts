// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterable<O>(as: Iterable<O>): Stream<unknown, never, O> {
  return fromChunk(A.from(as))
}
