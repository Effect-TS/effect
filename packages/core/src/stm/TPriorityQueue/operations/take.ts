import { STMRetryException } from "@effect/core/stm/STM/definition/primitives"
import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue take
 */
export function take<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self)
    const map = self.map.unsafeGet(journal)

    const result = map.headMaybe.flatMap((tuple) => {
      const a = tuple[1].tail.flatMap((c) => Maybe.fromPredicate(c, (_) => _.isNonEmpty))
      const k = tuple[0]

      self.map.unsafeSet(a._tag === "None" ? map.remove(k) : map.set(k, a.value), journal)

      return tuple[1].head
    })

    if (result._tag === "None") {
      throw new STMRetryException()
    }

    return result.value
  })
}
