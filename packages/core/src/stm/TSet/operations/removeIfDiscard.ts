import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Removes elements matching predicate.
 *
 * @tsplus static effect/core/stm/TSet.Aspects removeIfDiscard
 * @tsplus pipeable effect/core/stm/TSet removeIfDiscard
 * @category mutations
 * @since 1.0.0
 */
export function removeIfDiscard<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.removeIfDiscard((kv) => p(kv[0]))
  }
}
