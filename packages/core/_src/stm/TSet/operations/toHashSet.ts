import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Collects all elements into a hash set.
 *
 * @tsplus getter ets/TSet toHashSet
 */
export function toHashSet_<A>(self: TSet<A>): USTM<HashSet<A>> {
  concreteTSet(self)
  return self.toList.map((_) => _.toHashSet)
}
