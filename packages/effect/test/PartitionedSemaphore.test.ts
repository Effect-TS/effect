import { assert, describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Duration, Effect, Fiber, PartitionedSemaphore, TestClock } from "effect"

describe("PartitionedSemaphore", () => {
  it.effect("basic single partition operation", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 4 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all(
        [0, 1, 2, 3].map((n) =>
          sem.withPermits("partition-1", 2)(
            Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`)))
          )
        ),
        { concurrency: "unbounded", discard: true }
      ))

      yield* TestClock.adjust(Duration.seconds(3))
      strictEqual(messages.length, 2)

      yield* TestClock.adjust(Duration.seconds(3))
      strictEqual(messages.length, 4)
    }))

  it.effect("multiple partitions share total permits", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 4 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all([
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("p1-task1")))
        ),
        sem.withPermits("partition-2", 2)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("p2-task1")))
        ),
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("p1-task2")))
        )
      ], { concurrency: "unbounded", discard: true }))

      yield* TestClock.adjust(Duration.seconds(3))
      // Only 2 tasks can run simultaneously (4 permits / 2 permits each)
      strictEqual(messages.length, 2)

      yield* TestClock.adjust(Duration.seconds(3))
      strictEqual(messages.length, 3)
    }))

  it.effect("round-robin fairness across partitions", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 2 })
      const messages: Array<string> = []

      // Start with 2 permits taken
      yield* Effect.fork(
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("p1-initial")))
        )
      )

      yield* TestClock.adjust(1)

      // Queue 3 tasks from partition-1 (needs 3 permits total)
      yield* Effect.fork(Effect.all([
        sem.withPermits("partition-1", 1)(Effect.sync(() => messages.push("p1-task1"))),
        sem.withPermits("partition-1", 1)(Effect.sync(() => messages.push("p1-task2"))),
        sem.withPermits("partition-1", 1)(Effect.sync(() => messages.push("p1-task3")))
      ], { concurrency: "unbounded", discard: true }))

      yield* TestClock.adjust(1)

      // Queue 3 tasks from partition-2 (needs 3 permits total)
      yield* Effect.fork(Effect.all([
        sem.withPermits("partition-2", 1)(Effect.sync(() => messages.push("p2-task1"))),
        sem.withPermits("partition-2", 1)(Effect.sync(() => messages.push("p2-task2"))),
        sem.withPermits("partition-2", 1)(Effect.sync(() => messages.push("p2-task3")))
      ], { concurrency: "unbounded", discard: true }))

      yield* TestClock.adjust(Duration.seconds(3))

      // After initial task completes, permits should be distributed in round-robin fashion
      // Initial task completes first, then permits alternate between partitions
      deepStrictEqual(messages, [
        "p1-initial",
        "p1-task1",
        "p2-task1",
        "p1-task2",
        "p2-task2",
        "p1-task3",
        "p2-task3"
      ])
    }))

  it.effect("requesting more permits than total returns never", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 4 })

      const fiber = yield* Effect.fork(
        sem.withPermits("partition-1", 5)(Effect.succeed(42))
      )

      yield* TestClock.adjust(Duration.seconds(10))

      // Should still be running (never completes)
      assert.isNull(fiber.unsafePoll())
    }))

  it.effect("single permit operations", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 1 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all(
        [0, 1, 2].map((n) =>
          sem.withPermits("partition-1", 1)(
            Effect.delay(Duration.seconds(1))(Effect.sync(() => messages.push(`task: ${n}`)))
          )
        ),
        { concurrency: "unbounded", discard: true }
      ))

      yield* TestClock.adjust(Duration.seconds(1.5))
      strictEqual(messages.length, 1)

      yield* TestClock.adjust(Duration.seconds(1))
      strictEqual(messages.length, 2)

      yield* TestClock.adjust(Duration.seconds(1))
      strictEqual(messages.length, 3)
    }))

  it.effect("different permit sizes on same partition", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 5 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all([
        sem.withPermits("partition-1", 3)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("large")))
        ),
        sem.withPermits("partition-1", 1)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("small-1")))
        ),
        sem.withPermits("partition-1", 1)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("small-2")))
        )
      ], { concurrency: "unbounded", discard: true }))

      yield* TestClock.adjust(Duration.seconds(3))
      // All can run simultaneously (3 + 1 + 1 = 5 permits)
      strictEqual(messages.length, 3)
    }))

  it.effect("interruption releases permits", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 2 })
      const messages: Array<string> = []

      const fiber = yield* Effect.fork(
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(10))(Effect.sync(() => messages.push("long-task")))
        )
      )

      yield* TestClock.adjust(Duration.seconds(1))

      // Interrupt the long-running task
      yield* Fiber.interrupt(fiber)

      // Now we should be able to acquire permits again
      yield* sem.withPermits("partition-1", 2)(
        Effect.sync(() => messages.push("after-interrupt"))
      )

      strictEqual(messages.length, 1)
      strictEqual(messages[0], "after-interrupt")
    }))

  it.effect("interruption with partial permit acquisition releases all taken permits", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 3 })
      const messages: Array<string> = []

      // First task takes 2 permits, leaving 1 available
      const fiber1 = yield* Effect.fork(
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(5))(Effect.sync(() => messages.push("first")))
        )
      )

      yield* TestClock.adjust(Duration.millis(1))

      // Second task requests 3 permits
      // It should take the 1 available permit and wait for 2 more
      const fiber2 = yield* Effect.fork(
        sem.withPermits("partition-2", 3)(
          Effect.sync(() => messages.push("second"))
        )
      )

      yield* TestClock.adjust(Duration.millis(1))

      // At this point:
      // - Task 1 has taken 2 permits (running)
      // - Task 2 has taken 1 permit and is waiting for 2 more
      // - Total available: 0

      // Interrupt the second task while it's waiting with 1 permit taken
      yield* Fiber.interrupt(fiber2)

      // The interrupted task should release its partially taken permit (1)
      // Total available should now be 1

      // Verify we can acquire 1 permit now (proves the partial permit was released)
      yield* sem.withPermits("partition-3", 1)(
        Effect.sync(() => messages.push("can-acquire-one"))
      )

      strictEqual(messages.length, 1)
      deepStrictEqual(messages, ["can-acquire-one"])

      yield* TestClock.adjust(Duration.seconds(5))

      // Wait for first task to complete
      yield* Fiber.join(fiber1)

      deepStrictEqual(messages, ["can-acquire-one", "first"])

      // Now all 3 permits should be available again
      yield* sem.withPermits("partition-4", 3)(
        Effect.sync(() => messages.push("all-three"))
      )

      deepStrictEqual(messages, ["can-acquire-one", "first", "all-three"])
    }))

  it.effect("exact permit match", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 4 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all([
        sem.withPermits("partition-1", 4)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("exact-match")))
        ),
        sem.withPermits("partition-2", 1)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("waiting")))
        )
      ], { concurrency: "unbounded", discard: true }))

      yield* TestClock.adjust(Duration.seconds(3))
      // First task takes all permits
      strictEqual(messages.length, 1)
      strictEqual(messages[0], "exact-match")

      yield* TestClock.adjust(Duration.seconds(3))
      // Second task runs after first completes
      strictEqual(messages.length, 2)
    }))

  it.effect("many partitions", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 3 })
      const messages: Array<string> = []

      yield* Effect.fork(Effect.all(
        Array.from({ length: 10 }, (_, i) =>
          sem.withPermits(`partition-${i % 5}`, 1)(
            Effect.delay(Duration.seconds(1))(Effect.sync(() => messages.push(`p${i % 5}-task`)))
          )),
        { concurrency: "unbounded", discard: true }
      ))

      yield* TestClock.adjust(Duration.seconds(1.5))
      // 3 permits allow 3 concurrent tasks
      strictEqual(messages.length, 3)

      yield* TestClock.adjust(Duration.seconds(1))
      strictEqual(messages.length, 6)

      yield* TestClock.adjust(Duration.seconds(1))
      strictEqual(messages.length, 9)

      yield* TestClock.adjust(Duration.seconds(1))
      strictEqual(messages.length, 10)
    }))

  it.effect("partial permit allocation", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 3 })
      const messages: Array<string> = []

      // First task takes 2 permits
      yield* Effect.fork(
        sem.withPermits("partition-1", 2)(
          Effect.delay(Duration.seconds(2))(Effect.sync(() => messages.push("first")))
        )
      )

      yield* TestClock.adjust(Duration.millis(100))

      // Second task needs 2 permits, but only 1 available
      // It should take the 1 available and wait for 1 more
      const fiber = yield* Effect.fork(
        sem.withPermits("partition-2", 2)(
          Effect.sync(() => messages.push("second"))
        )
      )

      yield* TestClock.adjust(Duration.millis(100))

      // Second task should not have completed yet
      assert.isNull(fiber.unsafePoll())
      strictEqual(messages.length, 0)

      yield* TestClock.adjust(Duration.seconds(3))

      // After first task completes, second should run
      strictEqual(messages.length, 2)
      deepStrictEqual(messages, ["first", "second"])
    }))

  it.effect("zero permits requested", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 2 })
      let executed = false

      yield* sem.withPermits("partition-1", 0)(
        Effect.sync(() => {
          executed = true
        })
      )

      assert.isTrue(executed)
    }))

  it.effect("sequential tasks in same partition", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make({ permits: 2 })
      const messages: Array<string> = []

      yield* sem.withPermits("partition-1", 2)(
        Effect.sync(() => messages.push("task-1"))
      )

      yield* sem.withPermits("partition-1", 2)(
        Effect.sync(() => messages.push("task-2"))
      )

      yield* sem.withPermits("partition-1", 2)(
        Effect.sync(() => messages.push("task-3"))
      )

      deepStrictEqual(messages, ["task-1", "task-2", "task-3"])
    }))
})
