import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Scheduler from "effect/Scheduler"

const makeQueuedScheduler = (shouldYield?: Scheduler.Scheduler["shouldYield"]) => {
  const tasks: Array<() => void> = []
  const mixed = new Scheduler.MixedScheduler("sync", (task) => {
    let active = true
    tasks.push(() => {
      if (active) task()
    })
    return () => {
      active = false
    }
  })
  const scheduler: Scheduler.Scheduler = shouldYield
    ? {
      executionMode: "sync",
      shouldYield,
      makeDispatcher: () => mixed.makeDispatcher()
    }
    : mixed
  return {
    scheduler,
    drain: (limit = 100) => {
      let count = 0
      while (tasks.length > 0 && count < limit) {
        tasks.shift()!()
        count++
      }
      return tasks.length
    }
  }
}

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

  it("normalizes MaxOpsBeforeYield and makes progress with aggressive budgets", () => {
    const cases = [
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 3],
      [Number.NaN, 2048],
      [Number.POSITIVE_INFINITY, 2048],
      [Number.NEGATIVE_INFINITY, 2048],
      [2.75, 2],
      [-2.75, 1]
    ] as const

    for (const [budget, expected] of cases) {
      const queued = makeQueuedScheduler()
      let actual: number | undefined
      const fiber = Effect.withFiber((fiber) =>
        Effect.sync(() => {
          actual = fiber.maxOpsBeforeYield
        })
      ).pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, budget),
        Effect.provideService(Scheduler.Scheduler, queued.scheduler),
        Effect.runFork
      )

      assert.strictEqual(queued.drain(), 0, `budget: ${budget}`)
      assert.strictEqual(actual, expected, `budget: ${budget}`)
      assert.isDefined(fiber.pollUnsafe(), `budget: ${budget}`)
    }
  })

  it("makes progress when a custom scheduler always requests a yield", () => {
    const queued = makeQueuedScheduler(() => true)
    let operations = 0
    const fiber = Effect.sync(() => {
      operations++
    }).pipe(
      Effect.provideService(Scheduler.Scheduler, queued.scheduler),
      Effect.runFork
    )

    assert.strictEqual(queued.drain(), 0)
    assert.strictEqual(operations, 1)
    assert.isDefined(fiber.pollUnsafe())
  })

  it("makes progress when an always-yield scheduler captures an explicit yield", () => {
    const queued = makeQueuedScheduler(() => true)
    const fiber = Effect.yieldNow.pipe(
      Effect.provideService(Scheduler.Scheduler, queued.scheduler),
      Effect.runFork
    )

    assert.strictEqual(queued.drain(), 0)
    assert.isDefined(fiber.pollUnsafe())
  })

  it("restores yield checks when interruption replaces the pending operation", () => {
    const tasks: Array<() => void> = []
    let calls = 0
    let finalized = false
    let yieldRequested = false
    const scheduler: Scheduler.Scheduler = {
      executionMode: "sync",
      shouldYield: () => {
        calls++
        if (!yieldRequested) return false
        yieldRequested = false
        return true
      },
      makeDispatcher: () => ({
        scheduleTask: (task) => tasks.push(task),
        flush() {
          while (tasks.length > 0) tasks.shift()!()
        }
      })
    }
    const fiber = Effect.sync(() => {
      yieldRequested = true
    }).pipe(
      Effect.andThen(Effect.never),
      Effect.ensuring(Effect.sync(() => {
        finalized = true
      })),
      Effect.provideService(Scheduler.Scheduler, scheduler),
      Effect.runFork
    )

    assert.strictEqual(tasks.length, 1)
    const callsBeforeInterrupt = calls
    fiber.interruptUnsafe()
    assert.strictEqual(calls > callsBeforeInterrupt, true)
    assert.strictEqual(finalized, true)
    assert.isDefined(fiber.pollUnsafe())
  })
})
