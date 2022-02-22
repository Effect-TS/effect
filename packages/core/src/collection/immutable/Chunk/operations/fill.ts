import { Chunk } from "../definition"

/**
 * Fills a chunk with the result of applying `f` `n` times.
 *
 * @tsplus static ets/ChunkOps fill
 */
export function fill<A>(n: number, f: (n: number) => A): Chunk<A> {
  if (n <= 0) {
    return Chunk.empty<A>()
  }
  let builder = Chunk.empty<A>()
  for (let i = 0; i < n; i++) {
    builder = builder.append(f(i))
  }
  return builder
}
