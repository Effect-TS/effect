import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Atomically transforms the set into the difference of itself and the
 * provided set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects diff
 * @tsplus pipeable effect/core/stm/TSet diff
 * @category elements
 * @since 1.0.0
 */
export function diff<A>(other: TSet<A>) {
  return (self: TSet<A>): STM<never, never, void> =>
    other.toHashSet.flatMap(vals => self.removeIfDiscard((a) => pipe(vals, HashSet.has(a))))
}
