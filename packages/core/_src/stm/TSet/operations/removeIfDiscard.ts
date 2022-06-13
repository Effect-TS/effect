import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes elements matching predicate.
 *
 * @tsplus fluent ets/TSet removeIfDiscard
 */
export function removeIfDiscard_<A>(self: TSet<A>, p: (a: A) => boolean): USTM<void> {
  concreteTSet(self)
  return self.tmap.removeIfDiscard((kv) => p(kv.get(0)))
}

/**
 * Removes elements matching predicate.
 *
 * @tsplus static ets/TSet/Aspects removeIfDiscard
 */
export const removeIfDiscard = Pipeable(removeIfDiscard_)
