import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Takes a value from the queue, returning `None` if there is not a value in
 * the queue.
 *
 * @tsplus fluent ets/TPriorityQueue takeOption
 */
export function takeOption<A>(self: TPriorityQueue<A>): USTM<Option<A>> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self);
    const map = self.map.unsafeGet(journal);

    return map.headOption().flatMap((tuple) => {
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
  });
}
