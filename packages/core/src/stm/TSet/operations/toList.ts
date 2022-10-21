import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Collects all elements into a list.
 *
 * @tsplus getter effect/core/stm/TSet toList
 */
export function toList<A>(self: TSet<A>): USTM<List<A>> {
  concreteTSet(self)
  return self.tmap.keys
}
