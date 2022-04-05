import { STMRetryException } from "@effect-ts/core/stm/STM/definition/primitives";
import { concreteTPriorityQueue } from "@effect-ts/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Peeks at the first value in the queue without removing it, retrying until a
 * value is in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue peek
 */
export function peek<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self);
    const result = self.map.unsafeGet(journal).headOption()
      .map((tuple) => tuple.get(1))
      .flatMap((chunk) => chunk.head);

    if (result._tag === "None") {
      throw new STMRetryException();
    }
    return result.value;
  });
}
