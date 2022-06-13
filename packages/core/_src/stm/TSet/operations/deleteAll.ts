import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes elements from the set.
 *
 * @tsplus fluent ets/TSet deleteAll
 */
export function deleteAll_<A>(self: TSet<A>, as: Collection<A>): USTM<void> {
  concreteTSet(self)
  return self.tmap.deleteAll(as)
}

/**
 * Removes elements from the set.
 *
 * @tsplus static ets/TSet/Aspects deleteAll
 */
export const deleteAll = Pipeable(deleteAll_)
