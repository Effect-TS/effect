import type { Predicate } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Find the first element in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray find
 */
export function find_<A>(
  self: TArray<A>,
  p: Predicate<A>
): STM<unknown, never, Option<A>> {
  return STM.Effect((journal) => {
    let i = 0
    concrete(self)
    while (i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      if (p(a)) {
        return Option.some(a)
      }
      i++
    }
    return Option.none
  })
}

/**
 * Find the first element in the array matching a predicate.
 *
 * @ets_data_first find_
 */
export function find<A>(p: Predicate<A>) {
  return (self: TArray<A>): STM<unknown, never, Option<A>> => self.find(p)
}
