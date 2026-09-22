import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Option, PartitionedSemaphore, Scheduler } from "effect"

describe("PartitionedSemaphore", () => {
  it.effect("module-level combinators delegate to the instance api", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make<string>({ permits: 2 })

      assert.strictEqual(PartitionedSemaphore.capacity(sem), 2)
      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 2)

      yield* PartitionedSemaphore.take(sem, "a", 1)
      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 1)

      const value = yield* PartitionedSemaphore.withPermit(sem, "a", Effect.succeed(1))
      assert.strictEqual(value, 1)

      const released = yield* PartitionedSemaphore.release(sem, 1)
      assert.strictEqual(released, 2)

      const value2 = yield* PartitionedSemaphore.withPermits(sem, "b", 2, Effect.succeed(2))
      assert.strictEqual(value2, 2)

      const available = yield* PartitionedSemaphore.withPermitsIfAvailable(sem, 1, Effect.succeed("ok"))
      assert.deepStrictEqual(available, Option.some("ok"))

      const piped = yield* Effect.succeed(3).pipe(PartitionedSemaphore.withPermit(sem, "c"))
      assert.strictEqual(piped, 3)

      const piped2 = yield* Effect.succeed(4).pipe(PartitionedSemaphore.withPermits(sem, "c", 1))
      assert.strictEqual(piped2, 4)

      const pipedAvailable = yield* Effect.succeed("pipe").pipe(PartitionedSemaphore.withPermitsIfAvailable(sem, 1))
      assert.deepStrictEqual(pipedAvailable, Option.some("pipe"))
    }))

  it.effect("zero permits run immediately", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
      let executed = false

      yield* PartitionedSemaphore.withPermits(
        sem,
        "a",
        0,
        Effect.sync(() => {
          executed = true
        })
      )

      assert.isTrue(executed)
      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 1)
    }))

  it.effect("withPermitsIfAvailable does not block or run when unavailable", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
      let executed = false

      yield* PartitionedSemaphore.take(sem, "a", 1)

      const result = yield* PartitionedSemaphore.withPermitsIfAvailable(
        sem,
        1,
        Effect.sync(() => {
          executed = true
          return "ok"
        })
      )

      assert.deepStrictEqual(result, Option.none())
      assert.isFalse(executed)
    }))

  it.effect("interrupting a partially satisfied waiter releases all acquired permits", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make<string>({ permits: 4 })

      yield* PartitionedSemaphore.take(sem, "a", 3)
      const waiter = yield* PartitionedSemaphore.take(sem, "b", 3).pipe(Effect.forkChild)
      yield* Effect.yieldNow

      yield* PartitionedSemaphore.release(sem, 1)
      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 0)
      yield* Fiber.interrupt(waiter)
      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 2)
      yield* PartitionedSemaphore.release(sem, 2)

      assert.strictEqual(yield* PartitionedSemaphore.available(sem), 4)
      yield* PartitionedSemaphore.take(sem, "c", 4)
    }))

  for (const key of ["other", "same"]) {
    it.effect(`interrupting a resumed waiter preserves the next ${key}-key waiter`, () =>
      Effect.gen(function*() {
        const tasks: Array<() => void> = []
        let shouldYield = false
        const scheduler: Scheduler.Scheduler = {
          executionMode: "async",
          makeDispatcher() {
            return {
              scheduleTask(task) {
                tasks.push(task)
              },
              flush() {}
            }
          },
          shouldYield: () => {
            if (!shouldYield) return false
            shouldYield = false
            return true
          }
        }

        const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
        yield* sem.take("holder", 1)
        const first = yield* sem.take("same", 1).pipe(
          Effect.provideService(Scheduler.Scheduler, scheduler),
          Effect.forkChild({ startImmediately: true })
        )

        // Pause the selected waiter before its take effect finishes.
        shouldYield = true
        yield* sem.release(1)
        const next = yield* sem.take(key, 1).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Fiber.interrupt(first)
        while (tasks.length > 0) tasks.shift()!()

        const exit = next.pollUnsafe()
        yield* Fiber.interrupt(next)

        assert.deepStrictEqual(exit, Exit.void)
      }))
  }

  // A small op budget makes the fiber yield at each point between taking a
  // permit and installing its release; interrupting it there must return the
  // permit. (With a budget below 3 a fiber yields again before making
  // progress.)
  const interruptAtEveryYield = (
    test: (
      budget: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    ) => Effect.Effect<boolean>
  ) =>
    Effect.gen(function*() {
      const failed: Array<number> = []
      for (let ops = 3; ops <= 64; ops++) {
        const ok = yield* test(Effect.provideService(Scheduler.MaxOpsBeforeYield, ops))
        if (!ok) failed.push(ops)
      }
      assert.deepStrictEqual(failed, [])
    })

  it.effect("an interrupted withPermits returns its permit at every yield", () =>
    interruptAtEveryYield((budget) =>
      Effect.gen(function*() {
        const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
        const fiber = yield* Effect.forkChild(budget(sem.withPermits("k", 1)(Effect.never)), {
          startImmediately: true
        })
        yield* Fiber.interrupt(fiber)
        if ((yield* sem.available) !== 1) return false
        // the permit is really free: a later withPermits completes
        const next = yield* Effect.forkChild(sem.withPermits("k", 1)(Effect.void), { startImmediately: true })
        return next.pollUnsafe() !== undefined
      })
    ))

  it.effect("an interrupted withPermits returns a permit handed to it at every yield", () =>
    interruptAtEveryYield((budget) =>
      Effect.gen(function*() {
        const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
        yield* sem.take("a", 1)
        const fiber = yield* Effect.forkChild(budget(sem.withPermits("k", 1)(Effect.never)), {
          startImmediately: true
        })
        yield* Effect.yieldNow
        yield* sem.release(1)
        yield* Fiber.interrupt(fiber)
        return (yield* sem.available) === 1
      })
    ))

  it.effect("an interrupted withPermitsIfAvailable returns its permit at every yield", () =>
    interruptAtEveryYield((budget) =>
      Effect.gen(function*() {
        const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
        const fiber = yield* Effect.forkChild(budget(sem.withPermitsIfAvailable(1)(Effect.never)), {
          startImmediately: true
        })
        yield* Fiber.interrupt(fiber)
        return (yield* sem.available) === 1
      })
    ))

  it.effect("a waiter woken by a release runs and returns its permits", () =>
    interruptAtEveryYield((budget) =>
      Effect.gen(function*() {
        const sem = yield* PartitionedSemaphore.make<string>({ permits: 2 })
        yield* sem.take("a", 2)
        const fiber = yield* Effect.forkChild(budget(sem.withPermits("k", 2)(Effect.void)), {
          startImmediately: true
        })
        yield* sem.release(2)
        yield* Fiber.await(fiber)
        return (yield* sem.available) === 2
      })
    ))
})
