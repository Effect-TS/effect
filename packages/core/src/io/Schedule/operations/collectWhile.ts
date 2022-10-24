import type { Chunk } from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @tsplus static effect/core/io/Schedule.Ops collectWhile
 * @category mutations
 * @since 1.0.0
 */
export function collectWhile<A>(
  f: Predicate<A>
): Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>> {
  return Schedule.recurWhile(f).collectAll
}
