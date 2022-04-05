import { concreteTPriorityQueue } from "@effect-ts/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Collects all values into an array.
 *
 * @tsplus fluent ets/TPriorityQueue toImmutableArray
 */
export function toArray<A>(self: TPriorityQueue<A>): USTM<ImmutableArray<A>> {
  concreteTPriorityQueue(self);
  return self.map.modify((map) => {
    const entries = map.entries();
    const result: A[] = [];
    let e: IteratorResult<Tuple<[A, Chunk<A>]>>;
    while (!(e = entries.next()).done) {
      const { tuple: [, as] } = e.value;
      result.push(...Array.from(as));
    }
    return Tuple(ImmutableArray.from(result), map);
  });
}
