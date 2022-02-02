// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk"
import { chain_ } from "./chain"
import type { UIO } from "./definitions"
import { fromChunk } from "./fromChunk"
import { fromIterable } from "./fromIterable"

/**
 * Creates a stream from an array of values
 */
export function fromChunks<O>(...cs: A.Chunk<O>[]): UIO<O> {
  return chain_(fromIterable(cs), fromChunk)
}
