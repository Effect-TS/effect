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

  it("MixedScheduler runs tasks scheduled while running in the next cycle", () => {
    const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
    const order: Array<string> = []

    scheduler.scheduleTask(() => {
      order.push("a")
      // a lower priority value would run first if it joined the current cycle
      scheduler.scheduleTask(() => order.push("c"), -1)
      scheduler.scheduleTask(() => order.push("d"), 0)
    }, 0)
    scheduler.scheduleTask(() => order.push("b"), 0)

    scheduler.flush()

    assert.deepStrictEqual(order, ["a", "b", "c", "d"])
  })

  it("MixedScheduler orders priorities scheduled after priority 0 tasks", () => {
    const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
    const order: Array<string> = []

    scheduler.scheduleTask(() => order.push("p0-1"), 0)
    scheduler.scheduleTask(() => order.push("p0-2"), 0)
    scheduler.scheduleTask(() => order.push("p1-1"), 1)
    scheduler.scheduleTask(() => order.push("p-1-1"), -1)
    scheduler.scheduleTask(() => order.push("p0-3"), 0)
    scheduler.flush()

    scheduler.scheduleTask(() => order.push("p0-4"), 0)
    scheduler.scheduleTask(() => order.push("p0-5"), 0)
    scheduler.flush()

    assert.deepStrictEqual(order, ["p-1-1", "p0-1", "p0-2", "p0-3", "p1-1", "p0-4", "p0-5"])
  })

  it("MixedScheduler runs large cycles in order", () => {
    const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
    const order: Array<number> = []
    const expected: Array<number> = []

    for (let cycle = 0; cycle < 3; cycle++) {
      for (let i = 0; i < 100; i++) {
        const n = cycle * 100 + i
        expected.push(n)
        scheduler.scheduleTask(() => order.push(n), 0)
      }
      scheduler.flush()
    }

    assert.deepStrictEqual(order, expected)
  })

  it("MixedScheduler flush runs pending tasks and cancels the pending immediate", async () => {
    const setImmediate = vi.spyOn(globalThis, "setImmediate")
    const clearImmediate = vi.spyOn(globalThis, "clearImmediate")
    try {
      const scheduler = new Scheduler.MixedScheduler().makeDispatcher()
      const order: Array<string> = []

      scheduler.scheduleTask(() => order.push("a"), 0)
      scheduler.scheduleTask(() => order.push("b"), 0)
      assert.strictEqual(setImmediate.mock.calls.length, 1)
      assert.deepStrictEqual(order, [])

      scheduler.flush()
      assert.deepStrictEqual(order, ["a", "b"])
      assert.strictEqual(clearImmediate.mock.calls.length, 1)
      assert.strictEqual(clearImmediate.mock.calls[0][0], setImmediate.mock.results[0].value)

      scheduler.scheduleTask(() => order.push("c"), 0)
      assert.strictEqual(setImmediate.mock.calls.length, 2)
      // Immediates run in order, but a zero timeout can fire before a pending
      // immediate (it does under Bun)
      await new Promise((resolve) => setImmediate(resolve))
      assert.deepStrictEqual(order, ["a", "b", "c"])
    } finally {
      setImmediate.mockRestore()
      clearImmediate.mockRestore()
    }
  })

  it("MixedScheduler sync mode does not run tasks from a cancelled microtask", async () => {
    const scheduler = new Scheduler.MixedScheduler("sync").makeDispatcher()
    const order: Array<string> = []

    scheduler.scheduleTask(() => order.push("a"), 0)
    scheduler.flush()
    Promise.resolve().then(() => order.push("marker"))
    scheduler.scheduleTask(() => order.push("b"), 0)

    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepStrictEqual(order, ["a", "marker", "b"])
  })

  it("MixedScheduler cancels runs requested through a custom setImmediate", () => {
    const requested: Array<() => void> = []
    let cancelled = 0
    const scheduler = new Scheduler.MixedScheduler("async", (f) => {
      requested.push(f)
      return () => {
        cancelled++
      }
    }).makeDispatcher()
    const order: Array<string> = []

    scheduler.scheduleTask(() => order.push("a"), 0)
    scheduler.scheduleTask(() => order.push("b"), 0)
    assert.strictEqual(requested.length, 1)

    scheduler.flush()
    assert.deepStrictEqual(order, ["a", "b"])
    assert.strictEqual(cancelled, 1)

    scheduler.scheduleTask(() => order.push("c"), 0)
    assert.strictEqual(requested.length, 2)
    requested[1]()
    assert.deepStrictEqual(order, ["a", "b", "c"])
    assert.strictEqual(cancelled, 1)
  })

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

  describe("MixedScheduler dispatcher", () => {
    it("accepts a custom setImmediate that returns nothing", () => {
      const order: Array<string> = []
      const dispatcher = new Scheduler.MixedScheduler(
        "async",
        ((f: () => void) => {
          f()
        }) as any
      ).makeDispatcher()
      dispatcher.scheduleTask(() => order.push("a"), 0)
      dispatcher.scheduleTask(() => order.push("b"), 0)
      dispatcher.flush()
      assert.deepStrictEqual(order, ["a", "b"])
    })

    it("skips exactly the cancelled microtasks in sync mode", async () => {
      const dispatcher = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<string> = []
      dispatcher.scheduleTask(() => order.push("a"), 0)
      dispatcher.flush()
      dispatcher.scheduleTask(() => order.push("b"), 0)
      dispatcher.flush()
      dispatcher.scheduleTask(() => order.push("c"), 0)
      Promise.resolve().then(() => order.push("marker"))
      await new Promise((resolve) => setTimeout(resolve, 0))
      assert.deepStrictEqual(order, ["a", "b", "c", "marker"])
    })

    it("falls back to microtasks when timers throw, across flushes", async () => {
      const spy = vi.spyOn(globalThis, "setImmediate").mockImplementation(() => {
        throw new Error("no timers")
      })
      try {
        const dispatcher = new Scheduler.MixedScheduler().makeDispatcher()
        const order: Array<string> = []
        dispatcher.scheduleTask(() => order.push("a"), 0)
        dispatcher.flush()
        dispatcher.scheduleTask(() => order.push("b"), 0)
        Promise.resolve().then(() => order.push("marker"))
        await Promise.resolve()
        await Promise.resolve()
        assert.deepStrictEqual(order, ["a", "b", "marker"])
      } finally {
        spy.mockRestore()
      }
    })

    it("runs only the next cycle when flushed from a task", () => {
      const dispatcher = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<string> = []
      dispatcher.scheduleTask(() => {
        order.push("a")
        dispatcher.scheduleTask(() => order.push("c"), 0)
        dispatcher.flush()
        order.push("a-end")
      }, 0)
      dispatcher.scheduleTask(() => order.push("b"), 0)
      dispatcher.flush()
      for (let i = 0; i < 3; i++) dispatcher.scheduleTask(() => order.push(`d${i}`), 0)
      dispatcher.flush()
      assert.deepStrictEqual(order, ["a", "c", "a-end", "b", "d0", "d1", "d2"])
    })

    it("drops the rest of a cycle when a task throws", () => {
      const dispatcher = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<string> = []
      dispatcher.scheduleTask(() => {
        order.push("a")
        throw new Error("boom")
      }, 0)
      dispatcher.scheduleTask(() => order.push("b"), 0)
      assert.throws(() => dispatcher.flush())
      dispatcher.scheduleTask(() => order.push("c"), 0)
      dispatcher.flush()
      assert.deepStrictEqual(order, ["a", "c"])
    })

    it("orders NaN, -0 and negative priorities", () => {
      const dispatcher = new Scheduler.MixedScheduler("sync").makeDispatcher()
      const order: Array<string> = []
      dispatcher.scheduleTask(() => order.push("z1"), -0)
      dispatcher.scheduleTask(() => order.push("nan"), NaN)
      dispatcher.scheduleTask(() => order.push("z2"), 0)
      dispatcher.scheduleTask(() => order.push("neg"), -1)
      dispatcher.scheduleTask(() => order.push("p1"), 1)
      dispatcher.flush()
      assert.deepStrictEqual(order, ["neg", "z1", "nan", "z2", "p1"])
    })

    it("keeps no lanes once idle", () => {
      const dispatcher: any = new Scheduler.MixedScheduler("sync").makeDispatcher()
      dispatcher.scheduleTask(() => dispatcher.scheduleTask(() => {}, 0), 0)
      dispatcher.flush()
      assert.isUndefined(dispatcher.lane)
      assert.isUndefined(dispatcher.spareLane)
    })
  })
})
