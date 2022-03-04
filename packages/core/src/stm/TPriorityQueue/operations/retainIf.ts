import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus fluent ets/TPriorityQueue retainIf
 */
export function retainIf_<A>(self: TPriorityQueue<A>, f: Predicate<A>): USTM<void> {
  concrete(self)
  return self.map.update(SortedMap.map((chunk) => chunk.filter(f)))
}

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @ets_data_first retainIf_
 */
export function retainIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): USTM<void> => self.retainIf(f)
}
