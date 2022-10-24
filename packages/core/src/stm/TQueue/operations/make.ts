import type { Strategy } from "@effect/core/stm/TQueue/definition"
import { InternalTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Creates a queue with the specified strategy.
 *
 * @tsplus static effect/core/stm/TQueue.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(
  requestedCapacity: number,
  strategy: Strategy
): USTM<TQueue<A>> {
  return TRef.make(Queue.empty<A>()).map((ref) =>
    new InternalTQueue(ref, requestedCapacity, strategy)
  )
}
