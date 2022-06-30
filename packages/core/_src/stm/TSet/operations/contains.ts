import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Tests whether or not set contains an element.
 *
 * @tsplus static effect/core/stm/TSet.Aspects contains
 * @tsplus pipeable effect/core/stm/TSet contains
 */
export function contains<A>(value: A) {
  return (self: TSet<A>): STM<never, never, boolean> => {
    concreteTSet(self)
    return self.tmap.contains(value)
  }
}
