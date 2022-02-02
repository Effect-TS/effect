import { Chunk } from "../definition"

/**
 * Build a chunk from a sequence of values
 *
 * NOTE: different from Chunk#from this copies the elements 1 by 1
 * allowing for binary to be correctly stored in typed arrays
 *
 * @tsplus static ets/ChunkOps __call
 */
export function make<Elem extends readonly any[]>(...iter: Elem): Chunk<Elem[number]> {
  let builder = Chunk.empty<Elem[number]>()
  for (const x of iter) {
    builder = builder.append(x)
  }
  return builder
}
