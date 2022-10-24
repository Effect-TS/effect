import type { Chunk } from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @tsplus static effect/core/io/Schedule.Ops collectUntil
 * @category mutations
 * @since 1.0.0
 */
export function collectUntil<A>(
  f: Predicate<A>
): Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>> {
  return Schedule.recurUntil(f).collectAll
}
