import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as List from "@fp-ts/data/List"

/**
 * Collects all values into a List.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toList
 * @category conversions
 * @since 1.0.0
 */
export function toList<A>(self: TPriorityQueue<A>): USTM<List.List<A>> {
  concreteTPriorityQueue(self)
  return self.toReadonlyArray.map(List.fromIterable)
}
