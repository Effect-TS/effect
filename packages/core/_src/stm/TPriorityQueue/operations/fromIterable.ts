import { InternalTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Makes a new `TPriorityQueue` initialized with provided iterable.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops fromIterable
 */
export function fromIterable<A>(ord: Ord<A>) {
  return (data: LazyArg<Collection<A>>): STM<never, never, TPriorityQueue<A>> =>
    TRef.make(
      data().reduce(SortedMap.empty<A, Chunk<A>>(ord), (map, a) => map.set(a, Chunk.single(a)))
    ).map((map) => new InternalTPriorityQueue(map))
}
