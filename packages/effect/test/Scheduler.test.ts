import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Scheduler from "effect/Scheduler"

describe("Scheduler", () => {
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

  it("MixedScheduler runs the drained batch before rethrowing a task exception", () => {
    const scheduled: Array<() => void> = []
    const scheduler = new Scheduler.MixedScheduler("async", (task) => {
      scheduled.push(task)
      return () => {}
    }).makeDispatcher()
    const error = new Error("task failed")
    const order: Array<string> = []

    scheduler.scheduleTask(() => {
      order.push("throwing")
      scheduler.scheduleTask(() => order.push("next batch"), 0)
      throw error
    }, 0)
    scheduler.scheduleTask(() => order.push("same priority"), 0)
    scheduler.scheduleTask(() => order.push("different priority"), 1)

    let caught: unknown
    try {
      scheduled[0]()
    } catch (error) {
      caught = error
    }

    assert.strictEqual(caught, error)
    assert.deepStrictEqual(order, ["throwing", "same priority", "different priority"])

    scheduled[1]()
    assert.deepStrictEqual(order, ["throwing", "same priority", "different priority", "next batch"])
  })

  it("MixedScheduler aggregates multiple task exceptions after draining", () => {
    const scheduled: Array<() => void> = []
    const scheduler = new Scheduler.MixedScheduler("async", (task) => {
      scheduled.push(task)
      return () => {}
    }).makeDispatcher()
    const first = new Error("first")
    const second = new Error("second")
    const order: Array<number> = []

    scheduler.scheduleTask(() => {
      order.push(1)
      throw first
    }, 0)
    scheduler.scheduleTask(() => {
      order.push(2)
      throw second
    }, 1)
    scheduler.scheduleTask(() => order.push(3), 2)

    let caught: unknown
    try {
      scheduled[0]()
    } catch (error) {
      caught = error
    }

    assert.instanceOf(caught, AggregateError)
    assert.deepStrictEqual(caught.errors, [first, second])
    assert.deepStrictEqual(order, [1, 2, 3])
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
})
