import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * A schedule that recurs until the effectful condition f fails, collecting
 * all inputs into a list.
 *
 * @tsplus static effect/core/io/Schedule.Ops collectUntilEffect
 * @category mutations
 * @since 1.0.0
 */
export function collectUntilEffect<Env, A>(
  f: (a: A) => Effect<Env, never, boolean>
): Schedule<readonly [void, Chunk<A>], Env, A, Chunk<A>> {
  return Schedule.recurUntilEffect(f).collectAll
}
