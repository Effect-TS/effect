import { Strategy } from "@effect/core/io/Queue/operations/strategy"

/**
 * Makes a new bounded queue with the dropping strategy. When the capacity of
 * the queue is reached, new elements will be dropped.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @tsplus static effect/core/io/Queue.Ops dropping
 */
export function dropping<A>(
  requestedCapacity: number
): Effect<never, never, Queue<A>> {
  return Effect.sync(MutableQueue.bounded<A>(requestedCapacity)).flatMap((queue) =>
    Queue.create(queue, Strategy.Dropping())
  )
}
