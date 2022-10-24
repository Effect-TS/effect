import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Stores new element in the set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects put
 * @tsplus pipeable effect/core/stm/TSet put
 * @category mutations
 * @since 1.0.0
 */
export function put<A>(value: A) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.put(value, undefined as void)
  }
}
