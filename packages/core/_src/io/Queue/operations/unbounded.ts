import { Strategy } from "@effect/core/io/Queue/operations/strategy"

/**
 * Makes a new unbounded queue.
 *
 * @tsplus static ets/Queue/Ops unbounded
 */
export function unbounded<A>(__tsplusTrace?: string): Effect<never, never, Queue<A>> {
  return Effect.succeed(MutableQueue.unbounded<A>()).flatMap((queue) => Queue.create(queue, Strategy.Dropping()))
}
