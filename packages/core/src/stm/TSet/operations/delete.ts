import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes a single element from the set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects delete
 * @tsplus pipeable effect/core/stm/TSet delete
 */
export function _delete<A>(value: A) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.delete(value)
  }
}

export { _delete as delete }
