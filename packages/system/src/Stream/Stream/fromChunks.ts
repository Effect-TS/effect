// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { chain_ } from "./chain.js"
import type { UIO } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"
import { fromIterable } from "./fromIterable.js"

/**
 * Creates a stream from an array of values
 */
export function fromChunks<O>(...cs: A.Chunk<O>[]): UIO<O> {
  return chain_(fromIterable(cs), fromChunk)
}
