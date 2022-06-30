import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects takeUpTo
 * @tsplus pipeable effect/core/stm/TPriorityQueue takeUpTo
 */
export function takeUpTo(n: number) {
  return <A>(self: TPriorityQueue<A>): STM<never, never, Chunk<A>> => {
    concreteTPriorityQueue(self)
    return self.map.modify((map) => {
      const entries = map.entries
      const builder = Chunk.builder<Chunk<A>>()
      let updated = map
      let e: IteratorResult<Tuple<[A, Chunk<A>]>>
      let i = 0

      while (!(e = entries.next()).done && i < n) {
        const { tuple: [a, as] } = e.value
        const { tuple: [l, r] } = as.splitAt(n - i)

        builder.append(l)

        if (r.isEmpty) {
          updated = map.remove(a)
        } else {
          updated = map.set(a, r)
        }

        i += l.size
      }

      return Tuple(builder.build().flatten, updated)
    })
  }
}
