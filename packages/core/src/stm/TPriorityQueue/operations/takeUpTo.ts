import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects takeUpTo
 * @tsplus pipeable effect/core/stm/TPriorityQueue takeUpTo
 * @category mutations
 * @since 1.0.0
 */
export function takeUpTo(n: number) {
  return <A>(self: TPriorityQueue<A>): STM<never, never, Chunk.Chunk<A>> => {
    concreteTPriorityQueue(self)
    return self.map.modify((map) => {
      const entries = SortedMap.entries(map)
      const builder: Array<Chunk.Chunk<A>> = []
      let updated = map
      let e: IteratorResult<readonly [A, Chunk.Chunk<A>]>
      let i = 0

      while (!(e = entries.next()).done && i < n) {
        const [a, as] = e.value
        const [l, r] = pipe(as, Chunk.splitAt(n - i))

        builder.push(l)

        if (Chunk.isEmpty(r)) {
          updated = pipe(map, SortedMap.remove(a))
        } else {
          updated = pipe(map, SortedMap.set(a, r))
        }

        i += l.length
      }

      return [Chunk.flatten(Chunk.fromIterable(builder)), updated] as const
    })
  }
}
