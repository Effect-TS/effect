import { Strategy } from "@effect/core/io/Queue/operations/strategy"

/**
 * Makes a new unbounded queue.
 *
 * @tsplus static effect/core/io/Queue.Ops unbounded
 */
export function unbounded<A>(): Effect<never, never, Queue<A>> {
  return Effect.sync(MutableQueue.unbounded<A>()).flatMap((queue) =>
    Queue.create(queue, Strategy.Dropping())
  )
}
