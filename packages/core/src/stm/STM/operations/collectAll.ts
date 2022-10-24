import type { Chunk } from "@fp-ts/data/Chunk"
import { identity } from "@fp-ts/data/Function"

/**
 * Collects all the transactional effects in a collection, returning a single
 * transactional effect that produces a collection of values.
 *
 * @tsplus static effect/core/stm/STM.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<R, E, A>(as: Iterable<STM<R, E, A>>): STM<R, E, Chunk<A>> {
  return STM.forEach(as, identity)
}
