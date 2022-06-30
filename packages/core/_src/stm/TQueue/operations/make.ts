import type { Strategy } from "@effect/core/stm/TQueue/definition"
import { InternalTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Creates a queue with the specified strategy.
 *
 * @internal
 * @tsplus static effect/core/stm/TQueue.Ops make
 */
export function make<A>(
  requestedCapacity: number,
  strategy: Strategy
): USTM<TQueue<A>> {
  return TRef.make(ImmutableQueue.empty<A>()).map((ref) =>
    new InternalTQueue(
      ref,
      requestedCapacity,
      strategy
    )
  )
}
