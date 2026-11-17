import { assert, describe, it, vi } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber } from "effect"
import * as Scheduler from "effect/Scheduler"
import * as TestClock from "effect/testing/TestClock"

describe("Scheduler", () => {
  it("runSyncExit does not create a dispatcher for synchronous effects", () => {
    const makeDispatcher = vi.spyOn(Scheduler.MixedScheduler.prototype, "makeDispatcher")
    const exit = Effect.runSyncExit(Effect.sync(() => 1))
    const calls = makeDispatcher.mock.calls.length
    makeDispatcher.mockRestore()

    assert.deepStrictEqual(exit, Exit.succeed(1))
    assert.strictEqual(calls, 0)
  })

  it("runSyncExit flushes dispatcher work after yielding", () => {
    const exit = Effect.runSyncExit(Effect.as(Effect.yieldNow, 1))

    assert.deepStrictEqual(exit, Exit.succeed(1))
  })

  it("runSyncExit does not schedule timers after yielding", () => {
    const setImmediate = vi.spyOn(globalThis, "setImmediate").mockImplementation(() => {
      throw new Error("setImmediate is not supported")
    })
    const setTimeout = vi.spyOn(globalThis, "setTimeout").mockImplementation(() => {
      throw new Error("setTimeout is not supported")
    })

    try {
      const exit = Effect.runSyncExit(Effect.as(Effect.yieldNow, 1))

      assert.deepStrictEqual(exit, Exit.succeed(1))
      assert.strictEqual(setImmediate.mock.calls.length, 0)
      assert.strictEqual(setTimeout.mock.calls.length, 0)
    } finally {
      setImmediate.mockRestore()
      setTimeout.mockRestore()
    }
  })

  it.effect("MixedScheduler orders by priority (sync)", () =>
    Effect.sync(() => {
      const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<string> = []

      scheduler.scheduleTask(() => order.push("p0-1"), 0)
      scheduler.scheduleTask(() => order.push("p10-1"), 10)
      scheduler.scheduleTask(() => order.push("p-1-1"), -1)
      scheduler.scheduleTask(() => order.push("p10-2"), 10)
      scheduler.scheduleTask(() => order.push("p0-2"), 0)

      assert.deepStrictEqual(order, [])

      scheduler.flush()

      assert.deepStrictEqual(order, [
        "p-1-1",
        "p0-1",
        "p0-2",
        "p10-1",
        "p10-2"
      ])
    }))

  it.effect("MixedScheduler is FIFO within a priority", () =>
    Effect.sync(() => {
      const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<number> = []

      scheduler.scheduleTask(() => order.push(1), 5)
      scheduler.scheduleTask(() => order.push(2), 5)
      scheduler.scheduleTask(() => order.push(3), 5)

      scheduler.flush()

      assert.deepStrictEqual(order, [1, 2, 3])
    }))

  it.effect("PreventSchedulerYield disables shouldYield checks", () =>
    Effect.gen(function*() {
      let calls = 0
      const scheduler: Scheduler.Scheduler = {
        executionMode: "sync",
        shouldYield: () => {
          calls++
          return false
        },
        makeDispatcher() {
          return {} as any
        }
      }

      yield* Effect.sync(() => undefined).pipe(
        Effect.provideService(Scheduler.Scheduler, scheduler)
      )
      assert.strictEqual(calls > 0, true)

      calls = 0
      yield* Effect.sync(() => undefined).pipe(
        Effect.provideService(Scheduler.Scheduler, scheduler),
        Effect.provideService(Scheduler.PreventSchedulerYield, true)
      )
      assert.strictEqual(calls, 0)
    }))

  it("automatic dispatch failures terminate the fiber with a defect", () => {
    const defect = new Error("dispatch failed")
    const tasks: Array<() => void> = []
    let attempts = 0
    const scheduler: Scheduler.Scheduler = {
      executionMode: "async",
      shouldYield: (fiber) => fiber.currentOpCount >= 2,
      makeDispatcher: () => ({
        scheduleTask: (task) => {
          // Bound failures so a runtime that retries dispatch cannot spin forever.
          if (++attempts <= 5) throw defect
          tasks.push(task)
        },
        flush() {}
      })
    }
    const fiber = Effect.runFork(
      Effect.forEach([1, 2, 3], Effect.succeed, { concurrency: "unbounded" }),
      { scheduler }
    )

    assert.deepStrictEqual(fiber.pollUnsafe(), Exit.die(defect))
  })

  for (const budget of [1, 2, 3]) {
    it(`concurrent forEach completes with MaxOpsBeforeYield ${budget}`, () => {
      const tasks: Array<() => void> = []
      const scheduler = new Scheduler.MixedScheduler("async", (task) => {
        let cancelled = false
        tasks.push(() => {
          if (!cancelled) task()
        })
        return () => {
          cancelled = true
        }
      })
      const fiber = Effect.runFork(
        Effect.forEach([1, 2, 3], Effect.succeed, { concurrency: "unbounded" }).pipe(
          Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)
        ),
        { scheduler }
      )

      // Bound dispatches so a yielding livelock fails instead of hanging the test.
      for (let i = 0; i < 1000 && tasks.length > 0; i++) {
        tasks.shift()!()
      }
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed([1, 2, 3]))
    })
  }

  it.effect("inlined map steps count against MaxOpsBeforeYield", () =>
    Effect.gen(function*() {
      const order: Array<string> = []
      const chain = (label: string) => {
        let effect = Effect.succeed(0)
        for (let i = 0; i < 100; i++) {
          effect = Effect.map(effect, (n) => {
            order.push(label)
            return n + 1
          })
        }
        return effect
      }
      yield* Effect.all([chain("a"), chain("b")], { concurrency: "unbounded" }).pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 16)
      )
      assert.notStrictEqual(order.join(""), "a".repeat(100) + "b".repeat(100))
    }))

  it("MixedScheduler falls back to a microtask when timers cannot be set", async () => {
    // Cloudflare Workers throw for timers set in global scope
    const setImmediate = vi.spyOn(globalThis, "setImmediate").mockImplementation(() => {
      throw new Error("Disallowed operation called within global scope")
    })
    try {
      const count = Scheduler.MaxOpsBeforeYield.defaultValue() * 3
      const result = await Effect.runPromise(
        Effect.forEach(Array.from({ length: count }, (_, i) => i), (i) => Effect.succeed(i))
      )
      assert.strictEqual(result.length, count)
      assert.isAbove(setImmediate.mock.calls.length, 0)
    } finally {
      setImmediate.mockRestore()
    }
  })

  describe("ParkingScheduler", () => {
    // Runs each parked fiber when `land` is called, like a scheduler that hands
    // fibers back to the request that owns them
    const makeScheduler = () => {
      const pending: Array<() => void> = []
      let landing = false
      const scheduler = new class extends Scheduler.MixedScheduler implements Scheduler.ParkingScheduler {
        readonly resumed = new Map<Scheduler.ParkedFiber, boolean>()
        park(fiber: Scheduler.ParkedFiber): void {
          this.resumed.set(fiber, false)
        }
        resume(fiber: Scheduler.ParkedFiber, effect: Effect.Effect<unknown, unknown>): void {
          const resumed = this.resumed.get(fiber)
          if (resumed === undefined) return fiber.run(effect)
          if (resumed) return
          this.resumed.set(fiber, true)
          pending.push(() => {
            this.resumed.delete(fiber)
            fiber.run(effect)
          })
        }
      }("sync")
      const land = async () => {
        await Promise.resolve()
        landing = true
        while (pending.length > 0) pending.shift()!()
        landing = false
      }
      return { scheduler, land, isLanding: Effect.sync(() => landing) }
    }

    it("runs parked and forked fibers when it chooses, including under TestClock", async () => {
      const { isLanding, land, scheduler } = makeScheduler()
      const deferred = Deferred.makeUnsafe<void>()
      const fiber = Effect.runFork(
        Effect.gen(function*() {
          const child = yield* Effect.forkChild(isLanding)
          yield* Deferred.await(deferred)
          return [yield* Fiber.join(child), yield* isLanding]
        }).pipe(Effect.provide(TestClock.layer())),
        { scheduler }
      )
      await land()
      Effect.runSync(Deferred.succeed(deferred, undefined))
      assert.isUndefined(fiber.pollUnsafe())
      await land()
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed([true, true]))
    })

    it("interrupts a fiber woken before the interrupt, once it runs", async () => {
      const { land, scheduler } = makeScheduler()
      let wake!: () => void
      let continued = false
      const fiber = Effect.runFork(
        Effect.callback<void>((resume) => {
          wake = () => resume(Effect.void)
        }).pipe(Effect.andThen(Effect.sync(() => (continued = true)))),
        { scheduler }
      )
      wake()
      fiber.interruptUnsafe()
      assert.isUndefined(fiber.pollUnsafe())
      await land()
      assert.isFalse(continued)
      assert.isTrue(Exit.hasInterrupts(fiber.pollUnsafe()!))
    })
  })
})
