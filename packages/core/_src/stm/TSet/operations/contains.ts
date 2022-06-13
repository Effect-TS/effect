import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Tests whether or not set contains an element.
 *
 * @tsplus fluent ets/TSet contains
 */
export function contains_<A>(self: TSet<A>, a: A): USTM<boolean> {
  concreteTSet(self)
  return self.tmap.contains(a)
}

/**
 * Tests whether or not set contains an element.
 *
 * @tsplus static ets/TSet/Aspects contains
 */
export const contains = Pipeable(contains_)
