import { Strategy } from "@effect/core/io/Queue/operations/strategy"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/**
 * Makes a new unbounded queue.
 *
 * @tsplus static effect/core/io/Queue.Ops unbounded
 * @category  constructors
 * @since 1.0.0
 */
export function unbounded<A>(): Effect<never, never, Queue<A>> {
  return Effect.sync(MutableQueue.unbounded<A>()).flatMap((queue) =>
    Queue.create(queue, Strategy.Dropping())
  )
}
