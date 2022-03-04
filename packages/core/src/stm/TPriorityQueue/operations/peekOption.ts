import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue peekOption
 */
export function peekOption<A>(self: TPriorityQueue<A>): USTM<Option<A>> {
  concrete(self)
  return self.map.modify((map) =>
    Tuple(
      SortedMap.headOption(map)
        .map((tuple) => tuple.get(1))
        .flatMap((chunk) => chunk.head),
      map
    )
  )
}
