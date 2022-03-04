import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { USTM } from "../../STM"
import { STM, STMRetryException } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Peeks at the first value in the queue without removing it, retrying until a
 * value is in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue peek
 */
export function peek<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concrete(self)
    const result = SortedMap.headOption(self.map.unsafeGet(journal))
      .map((tuple) => tuple.get(1))
      .flatMap((chunk) => chunk.head)

    if (result._tag === "None") {
      throw new STMRetryException()
    }
    return result.value
  })
}
