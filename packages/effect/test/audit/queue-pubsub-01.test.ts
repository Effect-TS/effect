import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Queue } from "effect"

describe("Queue", () => {
  // packages/effect/src/Queue.ts:2045 (releaseCapacity) keeps iterating the old `offers` Set after
  // resuming a producer that synchronously shuts the queue down. Queue.shutdown (Queue.ts:1098)
  // promises to discard buffered messages and resume pending operations, and Queue.test.ts:180
  // asserts that such a reentrant shutdown must not defect the consumer.
  it.effect("reentrant shutdown with two pending producers does not defect the consumer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.offer(queue, 0)
      const producer1 = yield* Effect.forkChild(Effect.andThen(Queue.offer(queue, 1), Queue.shutdown(queue)), {
        startImmediately: true
      })
      const producer2 = yield* Effect.forkChild(Queue.offer(queue, 2), { startImmediately: true })

      const exit = yield* Effect.exit(Queue.take(queue))
      yield* Fiber.join(producer1)
      const offered = yield* Fiber.join(producer2)

      assert.deepStrictEqual(
        { exit, offered, buffered: queue.messages.length },
        { exit: Exit.succeed(0), offered: false, buffered: 0 }
      )
    }))
})
