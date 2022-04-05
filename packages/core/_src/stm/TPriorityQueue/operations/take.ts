import { STMRetryException } from "@effect-ts/core/stm/STM/definition/primitives";
import { concreteTPriorityQueue } from "@effect-ts/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue take
 */
export function take<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self);
    const map = self.map.unsafeGet(journal);

    const result = map.headOption().flatMap((tuple) => {
      const a = tuple
        .get(1)
        .tail.flatMap((c) => Option.fromPredicate(c, (_) => _.isNonEmpty()));
      const k = tuple.get(0);

      self.map.unsafeSet(
        a._tag === "None" ? map.remove(k) : map.set(k, a.value),
        journal
      );

      return tuple.get(1).head;
    });

    if (result._tag === "None") {
      throw new STMRetryException();
    }

    return result.value;
  });
}
