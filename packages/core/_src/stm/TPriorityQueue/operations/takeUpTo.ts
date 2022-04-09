import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @tsplus fluent ets/TPriorityQueue takeUpTo
 */
export function takeUpTo_<A>(self: TPriorityQueue<A>, n: number): USTM<Chunk<A>> {
  concreteTPriorityQueue(self);
  return self.map.modify((map) => {
    const entries = map.entries();
    const builder = Chunk.builder<Chunk<A>>();
    let updated = map;
    let e: IteratorResult<Tuple<[A, Chunk<A>]>>;
    let i = 0;

    while (!(e = entries.next()).done && i < n) {
      const { tuple: [a, as] } = e.value;
      const { tuple: [l, r] } = as.splitAt(n - i);

      builder.append(l);

      if (r.isEmpty()) {
        updated = map.remove(a);
      } else {
        updated = map.set(a, r);
      }

      i += l.size;
    }

    return Tuple(builder.build().flatten(), updated);
  });
}

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @tsplus static ets/TPriorityQueue takeUpTo
 */
export const takeUpTo = Pipeable(takeUpTo_);
