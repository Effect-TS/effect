import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import { STM, STMRetryException } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue take
 */
export function take<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concrete(self)
    const map = self.map.unsafeGet(journal)

    const result = SortedMap.headOption(map).flatMap((tuple) => {
      const a = tuple
        .get(1)
        .tail.flatMap((c) => Option.fromPredicate(c, (_) => _.isNonEmpty()))
      const k = tuple.get(0)

      self.map.unsafeSet(
        a._tag === "None" ? SortedMap.remove_(map, k) : SortedMap.set_(map, k, a.value),
        journal
      )

      return tuple.get(1).head
    })

    if (result._tag === "None") {
      throw new STMRetryException()
    }

    return result.value
  })
}
