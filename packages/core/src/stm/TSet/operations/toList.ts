import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import type { List } from "@fp-ts/data/List"

/**
 * Collects all elements into a list.
 *
 * @tsplus getter effect/core/stm/TSet toList
 * @category conversions
 * @since 1.0.0
 */
export function toList<A>(self: TSet<A>): USTM<List<A>> {
  concreteTSet(self)
  return self.tmap.keys
}
