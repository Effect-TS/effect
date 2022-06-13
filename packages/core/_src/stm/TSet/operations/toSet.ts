import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Collects all elements into a set.
 *
 * @tsplus getter ets/TSet toSet
 */
export function toSet_<A>(self: TSet<A>): USTM<Set<A>> {
  concreteTSet(self)
  // @ts-expect-error
  return self.toList.map((_) => _.toSet)
}
