import type { Chunk } from "../definition"
import { Singleton } from "../definition"

/**
 * Builds a chunk of a single value.
 *
 * @tsplus static ets/ChunkOps single
 */
export function single<A>(a: A): Chunk<A> {
  return new Singleton(a)
}
