import type * as A from "../../Array/core"
import { chain_ } from "./chain"
import type { UIO } from "./definitions"
import { fromChunk } from "./fromChunk"
import { fromIterable } from "./fromIterable"

/**
 * Creates a stream from an array of values
 */
export function fromChunks<O>(...cs: A.Array<O>[]): UIO<O> {
  return chain_(fromIterable(cs), fromChunk)
}
