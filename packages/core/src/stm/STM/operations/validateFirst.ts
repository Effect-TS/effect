import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static effect/core/stm/STM.Ops validateFirst
 * @category validation
 * @since 1.0.0
 */
export function validateFirst<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, B>
): STM<R, Chunk<E>, B> {
  return STM.forEach(as, (a) => f(a).flip).flip
}
