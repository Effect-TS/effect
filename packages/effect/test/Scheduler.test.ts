import { afterEach, assert, beforeEach, describe, it, vi } from "@effect/vitest"
import { Context, Effect, Exit } from "effect"
import * as Scheduler from "effect/Scheduler"

describe("Scheduler", () => {
  it("runFork runs on the default scheduler of the Scheduler reference", () => {
    const fiber = Effect.runFork(Effect.withFiber((fiber) => Effect.succeed(fiber)))
    const exit = fiber.pollUnsafe()
    assert.isTrue(exit !== undefined && Exit.isSuccess(exit))
    assert.strictEqual(fiber.cache.scheduler, Context.get(Context.empty(), Scheduler.Scheduler))
    // Calling the default directly still makes a new scheduler
    const fresh = Scheduler.Scheduler.defaultValue()
    assert.instanceOf(fresh, Scheduler.MixedScheduler)
    assert.notStrictEqual(fresh, fiber.cache.scheduler)
  })
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

  // The tests stub the global scheduler, so they cannot run concurrently
  describe("without setImmediate (browsers)", { concurrent: false }, () => {
    beforeEach(() => {
      vi.stubGlobal("scheduler", fakeTaskScheduler)
    })
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("yields through scheduler.postTask", async () => {
      const { Effect } = browser
      const before = postTaskCalls
      const result = await Effect.runPromise(
        Effect.forEach(Array.from({ length: 100 }, (_, i) => i), (i) => Effect.as(Effect.yieldNow, i))
      )
      assert.strictEqual(result.length, 100)
      assert.isAtLeast(postTaskCalls - before, 100)
    })

    it("runs dispatchers in scheduling order and skips cancelled runs", async () => {
      const { Scheduler } = browser
      const a = new Scheduler.MixedScheduler().makeDispatcher()
      const b = new Scheduler.MixedScheduler().makeDispatcher()
      const order: Array<string> = []

      a.scheduleTask(() => order.push("a1"), 0)
      b.scheduleTask(() => order.push("b1"), 0)
      // Flushing runs a1 now and cancels its pending run, which would otherwise
      // run a2 ahead of b1
      a.flush()
      a.scheduleTask(() => order.push("a2"), 0)
      assert.deepStrictEqual(order, ["a1"])

      while (order.length < 3) await nextMacrotask()
      await nextMacrotask()
      assert.deepStrictEqual(order, ["a1", "b1", "a2"])
    })

    it("interrupts a yielding fiber and runs its finalizers", async () => {
      const { Effect, Fiber } = browser
      let released = false
      const fiber = Effect.runFork(Effect.scoped(Effect.gen(function*() {
        yield* Effect.acquireRelease(Effect.void, () =>
          Effect.sync(() => {
            released = true
          }))
        while (true) yield* Effect.yieldNow
      })))
      await nextMacrotask()
      const exit = await Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber))))
      assert.isTrue(exit._tag === "Failure" && exit.cause.reasons.every((reason) => reason._tag === "Interrupt"))
      assert.isTrue(released)
    })

    it("falls back to setTimeout without postTask", async () => {
      const { Effect } = browser
      for (const stub of [undefined, {}]) {
        vi.stubGlobal("scheduler", stub)
        const setTimeout = vi.spyOn(globalThis, "setTimeout")
        try {
          assert.strictEqual(await Effect.runPromise(Effect.as(Effect.yieldNow, 1)), 1)
          assert.isAbove(setTimeout.mock.calls.length, 0)
        } finally {
          setTimeout.mockRestore()
        }
      }
    })

    it("reports throwing postTask callbacks via reportError without unhandled rejections", async () => {
      const { Scheduler } = browser
      const boom = new Error("task boom")
      const reported: Array<unknown> = []
      let unhandled = 0
      const onUnhandled = () => {
        unhandled++
      }
      process.on("unhandledRejection", onUnhandled)
      vi.stubGlobal("scheduler", {
        postTask(task: () => void) {
          return new Promise<void>((resolve, reject) => {
            realSetImmediate(() => {
              try {
                task()
                resolve()
              } catch (error) {
                reject(error)
              }
            })
          })
        }
      })
      vi.stubGlobal("reportError", (error: unknown) => {
        reported.push(error)
      })
      try {
        const dispatcher = new Scheduler.MixedScheduler().makeDispatcher()
        dispatcher.scheduleTask(() => {
          throw boom
        }, 0)
        await nextMacrotask()
        await nextMacrotask()
        assert.deepStrictEqual(reported, [boom])
        assert.strictEqual(unhandled, 0)
      } finally {
        process.off("unhandledRejection", onUnhandled)
      }
    })

    it("falls back to setTimeout rethrow when reportError is missing", async () => {
      const { Scheduler } = browser
      const boom = new Error("missing reportError boom")
      let unhandled = 0
      const onUnhandled = () => {
        unhandled++
      }
      const scheduled: Array<() => void> = []
      process.on("unhandledRejection", onUnhandled)
      vi.stubGlobal("scheduler", {
        postTask(task: () => void) {
          return new Promise<void>((resolve, reject) => {
            realSetImmediate(() => {
              try {
                task()
                resolve()
              } catch (error) {
                reject(error)
              }
            })
          })
        }
      })
      vi.stubGlobal("reportError", undefined)
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(
        ((fn: () => void) => {
          scheduled.push(fn)
          return 0 as any
        }) as any
      )
      try {
        const dispatcher = new Scheduler.MixedScheduler().makeDispatcher()
        dispatcher.scheduleTask(() => {
          throw boom
        }, 0)
        await new Promise((resolve) => realSetImmediate(resolve))
        await new Promise((resolve) => realSetImmediate(resolve))
        assert.strictEqual(unhandled, 0)
        assert.strictEqual(scheduled.length, 1)
        let caught: unknown
        try {
          scheduled[0]()
        } catch (error) {
          caught = error
        }
        assert.strictEqual(caught, boom)
      } finally {
        setTimeoutSpy.mockRestore()
        process.off("unhandledRejection", onUnhandled)
      }
    })
  })
})

const nextMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0))

// Stands in for the browser's scheduler.postTask: queues a real macrotask.
const realSetImmediate = globalThis.setImmediate
let postTaskCalls = 0
const fakeTaskScheduler = {
  postTask(task: () => void) {
    postTaskCalls++
    realSetImmediate(task)
  }
}

// The timer function is chosen when the module loads, so load a fresh copy
// while setImmediate is missing and a scheduler global exists. This runs during
// collection, before the tests touch globals.
const loadInBrowser = async () => {
  const original = globalThis.setImmediate
  delete (globalThis as any).setImmediate
  ;(globalThis as any).scheduler = undefined
  vi.resetModules()
  try {
    const [Effect, Fiber, Scheduler] = await Promise.all([
      import("effect/Effect"),
      import("effect/Fiber"),
      import("effect/Scheduler")
    ])
    return { Effect, Fiber, Scheduler }
  } finally {
    globalThis.setImmediate = original
    delete (globalThis as any).scheduler
  }
}
const browser = await loadInBrowser()
