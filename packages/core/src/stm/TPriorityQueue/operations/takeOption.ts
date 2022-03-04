import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Takes a value from the queue, returning `None` if there is not a value in
 * the queue.
 *
 * @tsplus fluent ets/TPriorityQueue takeOption
 */
export function takeOption<A>(self: TPriorityQueue<A>): USTM<Option<A>> {
  return STM.Effect((journal) => {
    concrete(self)
    const map = self.map.unsafeGet(journal)

    return SortedMap.headOption(map).flatMap((tuple) => {
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
  })
}
