import { Chunk } from "../definition"

/**
 * Return a chunk of length `n` with element `i` initialized with `f(i)`.
 *
 * @tsplus static ets/ChunkOps makeBy
 */
export function makeBy<A>(n: number, f: (i: number) => A): Chunk<A> {
  const b = Chunk.builder<A>()

  for (let i = 0; i < n; i++) {
    b.append(f(i))
  }

  return b.build()
}
