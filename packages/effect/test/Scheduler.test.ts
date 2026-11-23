import { assert, describe, it, vi } from "@effect/vitest"
import { Context, Effect, Exit, Fiber } from "effect"
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
    // Holds a parked fiber's first effect until `land` runs it, and drops the
    // others, as the ParkingScheduler contract allows
    const makeScheduler = () => {
      const pending = new Map<Scheduler.ParkedFiber, Effect.Effect<unknown, unknown> | undefined>()
      const scheduler = new class extends Scheduler.MixedScheduler implements Scheduler.ParkingScheduler {
        readonly [Scheduler.ParkingSchedulerTypeId] = Scheduler.ParkingSchedulerTypeId
        park(fiber: Scheduler.ParkedFiber): void {
          pending.set(fiber, undefined)
        }
        resume(fiber: Scheduler.ParkedFiber, effect: Effect.Effect<unknown, unknown>): void {
          if (!pending.has(fiber)) return fiber.run(effect)
          if (pending.get(fiber) === undefined) pending.set(fiber, effect)
        }
      }("sync")
      let landing = false
      const land = async () => {
        // Lets the dispatcher start forked fibers
        await Promise.resolve()
        landing = true
        for (let ran = true; ran;) {
          ran = false
          for (const [fiber, effect] of pending) {
            if (effect === undefined) continue
            pending.delete(fiber)
            fiber.run(effect)
            ran = true
          }
        }
        landing = false
      }
      return { scheduler, land, isLanding: Effect.sync(() => landing) }
    }

    const makeWait = () => {
      let wake!: () => void
      const wait = Effect.callback<void>((resume) => {
        wake = () => resume(Effect.void)
      })
      return { wait, wake: () => wake() }
    }

    it("runs parked and forked fibers only when the scheduler resumes them, under TestClock too", async () => {
      const { isLanding, land, scheduler } = makeScheduler()
      const { wait, wake } = makeWait()
      const fiber = Effect.runFork(
        Effect.forkChild(isLanding).pipe(
          Effect.tap(() => wait),
          Effect.flatMap(Fiber.join),
          Effect.provide(TestClock.layer())
        ),
        { scheduler }
      )
      await land()
      wake()
      assert.isUndefined(fiber.pollUnsafe())
      await land()
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed(true))
    })

    it("interrupts a fiber woken before the interrupt instead of continuing it", async () => {
      const { land, scheduler } = makeScheduler()
      const { wait, wake } = makeWait()
      let continued = false
      const fiber = Effect.runFork(wait.pipe(Effect.andThen(Effect.sync(() => (continued = true)))), { scheduler })
      wake()
      fiber.interruptUnsafe()
      await land()
      assert.isFalse(continued)
      assert.isTrue(Exit.hasInterrupts(fiber.pollUnsafe()!))
    })

    it("resumes a suspended fiber that setContext moves to another scheduler, which it uses from then on", async () => {
      const { land, scheduler } = makeScheduler()
      const { wait, wake } = makeWait()
      let steps = 0
      const fiber = Effect.runFork(
        wait.pipe(Effect.andThen(Effect.sync(() => steps++)), Effect.andThen(wait)),
        { scheduler }
      )
      fiber.setContext(Context.add(fiber.context, Scheduler.Scheduler, new Scheduler.MixedScheduler("sync")))
      wake()
      assert.strictEqual(steps, 0)
      await land()
      assert.strictEqual(steps, 1)
      // The second wait is not held by the parking scheduler
      wake()
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.void)
    })
  })
})
