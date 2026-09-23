import { assert, describe, it, vi } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Scheduler from "effect/Scheduler"

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

  // Queues the fiber's tasks instead of running them, so a test drives the
  // fiber one resumption at a time.
  const steppingScheduler = () => {
    const tasks: Array<() => void> = []
    const base = new Scheduler.MixedScheduler("async")
    const scheduler: Scheduler.Scheduler = {
      executionMode: "async",
      shouldYield: (fiber) => base.shouldYield(fiber),
      makeDispatcher: () => ({
        scheduleTask(task) {
          tasks.push(task)
        },
        flush() {}
      })
    }
    return { scheduler, tasks }
  }

  it("a fiber makes progress with any operation budget, and resumes as often as before", () => {
    const observed: Array<string> = []
    for (let budget = 1; budget <= 8; budget++) {
      const { scheduler, tasks } = steppingScheduler()
      const fiber = Effect.runFork(
        Effect.forEach([1, 2, 3], (n) => Effect.map(Effect.succeed(n), (x) => x * 2)).pipe(
          Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)
        ),
        { scheduler }
      )
      // A fiber that makes no progress never runs out of resumptions, so the
      // loop is bounded well above what the program needs.
      let resumptions = 0
      while (fiber.pollUnsafe() === undefined && resumptions < 256) {
        const task = tasks.shift()
        if (task === undefined) break
        resumptions++
        task()
      }
      const exit = fiber.pollUnsafe()
      const result = exit !== undefined && Exit.isSuccess(exit) ? JSON.stringify(exit.value) : "no progress"
      observed.push(`budget ${budget}: ${result} in ${resumptions} resumptions`)
    }
    // The resumption counts are pinned, not just the results: a budget of 3 or
    // more must reach its yields at the same operations as it always has, so
    // widening the exemption past the two operations the yield itself costs
    // shows up here even though every program still produces the same value.
    assert.deepStrictEqual(observed, [
      "budget 1: [2,4,6] in 15 resumptions",
      "budget 2: [2,4,6] in 15 resumptions",
      "budget 3: [2,4,6] in 14 resumptions",
      "budget 4: [2,4,6] in 7 resumptions",
      "budget 5: [2,4,6] in 4 resumptions",
      "budget 6: [2,4,6] in 3 resumptions",
      "budget 7: [2,4,6] in 2 resumptions",
      "budget 8: [2,4,6] in 2 resumptions"
    ])
  })

  it("a callback that resumes a fiber consults the operation budget at its first operation", () => {
    const tasks: Array<() => void> = []
    let armed = false
    const scheduler: Scheduler.Scheduler = {
      executionMode: "async",
      shouldYield: () => {
        if (!armed) return false
        armed = false
        return true
      },
      makeDispatcher: () => ({
        scheduleTask(task) {
          tasks.push(task)
        },
        flush() {}
      })
    }
    const steps: Array<string> = []
    let resume: ((effect: Effect.Effect<void>) => void) | undefined
    const fiber = Effect.runFork(
      Effect.flatMap(
        Effect.callback<void>((cb) => {
          resume = cb
        }),
        () =>
          Effect.sync(() => {
            steps.push("continued")
          })
      ),
      { scheduler }
    )

    assert.isDefined(resume)
    armed = true
    resume(Effect.sync(() => {
      steps.push("resumed")
    }))
    // The budget was consulted before the resuming effect ran, so the fiber
    // yielded instead of running it.
    assert.deepStrictEqual(steps, [])
    assert.strictEqual(tasks.length, 1)

    const task = tasks.shift()
    assert.isDefined(task)
    task()
    assert.deepStrictEqual(steps, ["resumed", "continued"])
    assert.deepStrictEqual(fiber.pollUnsafe(), Exit.void)
  })

  it("Effect.yieldNow consults the operation budget when the fiber resumes", () => {
    const tasks: Array<() => void> = []
    let armed = false
    const scheduler: Scheduler.Scheduler = {
      executionMode: "async",
      shouldYield: () => {
        if (!armed) return false
        armed = false
        return true
      },
      makeDispatcher: () => ({
        scheduleTask(task) {
          tasks.push(task)
        },
        flush() {}
      })
    }
    const steps: Array<string> = []
    const fiber = Effect.runFork(
      Effect.flatMap(Effect.yieldNow, () =>
        Effect.sync(() => {
          steps.push("after")
        })),
      { scheduler }
    )

    const resume = tasks.shift()
    assert.isDefined(resume)
    armed = true
    resume()
    // The budget was consulted on the first operation after the yield, so the
    // effect that follows it has not run yet.
    assert.deepStrictEqual(steps, [])
    assert.strictEqual(tasks.length, 1)

    const task = tasks.shift()
    assert.isDefined(task)
    task()
    assert.deepStrictEqual(steps, ["after"])
    assert.deepStrictEqual(fiber.pollUnsafe(), Exit.void)
  })

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
})
