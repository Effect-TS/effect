import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes elements from the set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects deleteAll
 * @tsplus pipeable effect/core/stm/TSet deleteAll
 */
export function deleteAll<A>(as: Collection<A>) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.deleteAll(as)
  }
}
