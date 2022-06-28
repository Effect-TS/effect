import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes elements matching predicate.
 *
 * @tsplus static effect/core/stm/TSet.Aspects removeIfDiscard
 * @tsplus pipeable effect/core/stm/TSet removeIfDiscard
 */
export function removeIfDiscard<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.removeIfDiscard((kv) => p(kv.get(0)))
  }
}
