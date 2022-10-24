import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Returns the set's cardinality.
 *
 * @tsplus getter effect/core/stm/TSet size
 * @category getters
 * @since 1.0.0
 */
export function size<A>(self: TSet<A>): USTM<number> {
  concreteTSet(self)
  return self.tmap.size
}
