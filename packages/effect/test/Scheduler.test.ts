import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Result } from "effect"
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

  it("converts a throwing shouldYield to the original defect without recursive overflow", () => {
    const defect = new Error("shouldYield")
    let calls = 0
    const scheduler: Scheduler.Scheduler = {
      executionMode: "sync",
      shouldYield: () => {
        calls++
        throw defect
      },
      makeDispatcher: () => ({}) as any
    }

    const exit = Effect.runFork(Effect.void, { scheduler }).pollUnsafe()
    assert.isDefined(exit)
    const result = Exit.findDefect(exit!)
    assert.isTrue(Result.isSuccess(result))
    if (Result.isSuccess(result)) {
      assert.strictEqual(result.success, defect)
    }
    assert.strictEqual(calls, 1)
  })
})
