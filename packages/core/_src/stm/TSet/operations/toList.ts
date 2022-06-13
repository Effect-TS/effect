import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Collects all elements into a list.
 *
 * @tsplus getter ets/TSet toList
 */
export function toList_<A>(self: TSet<A>): USTM<List<A>> {
  concreteTSet(self)
  return self.tmap.keys
}
