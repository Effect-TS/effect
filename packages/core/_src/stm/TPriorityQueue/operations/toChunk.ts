import { concreteTPriorityQueue } from "@effect-ts/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Collects all values into a chunk.
 *
 * @tsplus fluent ets/TPriorityQueue toChunk
 */
export function toChunk<A>(self: TPriorityQueue<A>): USTM<Chunk<A>> {
  concreteTPriorityQueue(self);
  return self.map.modify((map) => {
    const entries = map.entries();
    const builder = Chunk.builder<Chunk<A>>();
    let e: IteratorResult<Tuple<[A, Chunk<A>]>>;

    while (!(e = entries.next()).done) {
      const { tuple: [, as] } = e.value;
      builder.append(as);
    }

    return Tuple(builder.build().flatten(), map);
  });
}
