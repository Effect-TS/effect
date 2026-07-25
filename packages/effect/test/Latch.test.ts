import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch } from "effect"
import * as Scheduler from "effect/Scheduler"

describe("Latch", () => {
  it.effect("release wakes current waiters and keeps the latch closed", () =>
    Effect.gen(function*() {
      const latch = yield* Latch.make(false)
      const waiter = yield* Effect.forkChild(
        Latch.await(latch),
        { startImmediately: true }
      )

      assert.isUndefined(waiter.pollUnsafe())

      yield* latch.release
      yield* Effect.yieldNow
      yield* Effect.yieldNow

      assert.isDefined(waiter.pollUnsafe())
    }))

  it.effect("isOpen reflects the state of the latch", () =>
    Effect.gen(function*() {
      const latch = yield* Latch.make(false)

      assert.isFalse(latch.isOpen())

      yield* latch.open
      yield* Effect.yieldNow

      assert.isTrue(latch.isOpen())
    }))

  it.effect("await is interruptible and cleans up interrupted waiters", () =>
    Effect.gen(function*() {
      const latch = yield* Latch.make(false)
      const tasks: Array<() => void> = []
      const scheduler: Scheduler.Scheduler = {
        executionMode: "async",
        makeDispatcher() {
          return {
            scheduleTask(task, _priority) {
              tasks.push(task)
            },
            flush() {
            }
          }
        },
        shouldYield: () => false
      }
      const resumed: Array<string> = []
      const interrupted = yield* Effect.forkChild(
        Effect.gen(function*() {
          yield* Latch.await(latch)
          resumed.push("interrupted")
        }),
        { startImmediately: true }
      )

      assert.isUndefined(interrupted.pollUnsafe())

      yield* Fiber.interrupt(interrupted)
      const exit = yield* Fiber.await(interrupted)
      assert.isTrue(Exit.hasInterrupts(exit))

      yield* latch.release.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
      assert.lengthOf(tasks, 0)

      const live = yield* Effect.forkChild(
        Effect.gen(function*() {
          yield* Latch.await(latch)
          resumed.push("live")
        }),
        { startImmediately: true }
      )

      assert.isUndefined(live.pollUnsafe())

      yield* latch.release.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
      assert.lengthOf(tasks, 1)
      assert.isUndefined(live.pollUnsafe())

      tasks.shift()!()
      yield* Fiber.join(live)

      assert.deepStrictEqual(resumed, ["live"])
      assert.isFalse(latch.isOpen())
    }))
})
