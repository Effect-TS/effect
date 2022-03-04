import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @tsplus fluent ets/TPriorityQueue removeIf
 */
export function removeIf_<A>(self: TPriorityQueue<A>, f: Predicate<A>): USTM<void> {
  return self.retainIf((a) => !f(a))
}

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @ets_data_first removeIf_
 */
export function removeIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): USTM<void> => self.removeIf(f)
}
