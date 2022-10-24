import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Collects all elements into a hash set.
 *
 * @tsplus getter effect/core/stm/TSet toHashSet
 * @category conversions
 * @since 1.0.0
 */
export function toHashSet<A>(self: TSet<A>): USTM<HashSet.HashSet<A>> {
  concreteTSet(self)
  return self.tmap.keys.map(HashSet.from)
}
