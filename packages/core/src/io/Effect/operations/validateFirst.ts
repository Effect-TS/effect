import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static effect/core/io/Effect.Ops validateFirst
 * @category validation
 * @since 1.0.0
 */
export function validateFirst<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, Chunk<E>, B> {
  return Effect.forEach(as, (a) => f(a).flip).flip
}
