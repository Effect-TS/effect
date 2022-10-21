import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Tests if the map is empty or not
 *
 * @tsplus getter effect/core/stm/TSet isEmpty
 */
export function isEmpty<A>(self: TSet<A>): USTM<boolean> {
  concreteTSet(self)
  return self.tmap.isEmpty
}
