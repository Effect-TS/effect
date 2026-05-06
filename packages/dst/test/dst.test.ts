import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as DSTScheduler from "effect/DSTScheduler"

describe("DSTScheduler", () => {
  describe("DSTScheduler.make", () => {
    it("creates scheduler with seed", () => {
      const scheduler = DSTScheduler.make({ seed: 42 })
      expect(scheduler.seed).toBe(42)
      expect(scheduler.tick).toBe(0)
      expect(scheduler.hasPending()).toBe(false)
    })

    it("step returns false when no tasks pending", () => {
      const scheduler = DSTScheduler.make({ seed: 42 })
      expect(scheduler.step()).toBe(false)
    })

    it("executes scheduled tasks via step", () => {
      const scheduler = DSTScheduler.make({ seed: 42 })
      let executed = false
      scheduler.scheduleTask(() => { executed = true }, 0)
      expect(scheduler.hasPending()).toBe(true)
      expect(scheduler.step()).toBe(true)
      expect(executed).toBe(true)
      expect(scheduler.hasPending()).toBe(false)
    })

    it("same seed produces same execution order", () => {
      const makeScheduler = (seed: number) => {
        const scheduler = DSTScheduler.make({ seed })
        const order: number[] = []
        for (let i = 0; i < 10; i++) {
          const id = i
          scheduler.scheduleTask(() => { order.push(id) }, 0)
        }
        scheduler.stepUntilDone()
        return order
      }

      const order1 = makeScheduler(42)
      const order2 = makeScheduler(42)

      // Same seed = same order
      expect(order1).toEqual(order2)
      expect(order1.length).toBe(10)
    })

    it("different seeds explore different orderings", () => {
      const orders = new Set<string>()

      for (let seed = 0; seed < 50; seed++) {
        const scheduler = DSTScheduler.make({ seed })
        const order: number[] = []
        for (let i = 0; i < 5; i++) {
          const id = i
          scheduler.scheduleTask(() => { order.push(id) }, 0)
        }
        scheduler.stepUntilDone()
        orders.add(order.join(","))
      }

      // With 5 tasks and 50 seeds, we should see multiple orderings
      expect(orders.size).toBeGreaterThan(1)
    })

    it("records events in the event log", () => {
      const scheduler = DSTScheduler.make({ seed: 42 })
      scheduler.scheduleTask(() => {}, 0)
      scheduler.scheduleTask(() => {}, 0)
      scheduler.stepUntilDone()

      const log = scheduler.getEventLog()
      expect(log.seed).toBe(42)
      expect(log.events.length).toBeGreaterThanOrEqual(4)
    })

    it("snapshot captures state", () => {
      const scheduler = DSTScheduler.make({ seed: 42 })

      for (let i = 0; i < 5; i++) {
        scheduler.scheduleTask(() => {}, 0)
      }
      scheduler.stepUntilDone()

      const snap = scheduler.snapshot()
      expect(snap.tick).toBe(5)
      expect(snap.prngState).toHaveLength(4)
    })

    it("respects maxSteps limit", () => {
      const scheduler = DSTScheduler.make({ seed: 42, maxSteps: 5 })

      // Schedule tasks that spawn more tasks (potential infinite loop)
      const scheduleMore = () => {
        scheduler.scheduleTask(scheduleMore, 0)
      }
      scheduler.scheduleTask(scheduleMore, 0)

      const steps = scheduler.stepUntilDone()
      expect(steps).toBe(5)
      expect(scheduler.hasPending()).toBe(true)
    })
  })

  describe("DSTScheduler.run", () => {
    it("runs a simple effect deterministically", async () => {
      const result = await Effect.runPromise(
        DSTScheduler.run(
          Effect.succeed(42),
          { seed: 1 }
        )
      )
      expect(Exit.isSuccess(result.exit)).toBe(true)
      if (Exit.isSuccess(result.exit)) {
        expect(result.exit.value).toBe(42)
      }
      expect(result.seed).toBe(1)
    })

    it("same seed produces same result for race", async () => {
      const runRace = (seed: number) =>
        Effect.runPromise(
          DSTScheduler.run(
            Effect.race(
              Effect.succeed("left"),
              Effect.succeed("right")
            ),
            { seed }
          )
        )

      const result1 = await runRace(42)
      const result2 = await runRace(42)

      // Same seed = same winner
      expect(result1.exit).toEqual(result2.exit)
    })

    it("captures failure exits", async () => {
      const result = await Effect.runPromise(
        DSTScheduler.run(
          Effect.fail("boom"),
          { seed: 1 }
        )
      )
      expect(Exit.isFailure(result.exit)).toBe(true)
    })

    it("returns step count and event log", async () => {
      const result = await Effect.runPromise(
        DSTScheduler.run(
          Effect.gen(function*() {
            yield* Effect.yieldNow()
            return 42
          }),
          { seed: 1 }
        )
      )
      expect(result.steps).toBeGreaterThanOrEqual(0)
      expect(result.eventLog.seed).toBe(1)
    })
  })

  describe("DSTScheduler.runMany", () => {
    it("runs across multiple seeds", async () => {
      const results = await Effect.runPromise(
        DSTScheduler.runMany(
          Effect.succeed(42),
          { seedCount: 10, seedStart: 0 }
        )
      )
      expect(results).toHaveLength(10)
      for (const result of results) {
        expect(Exit.isSuccess(result.exit)).toBe(true)
      }
    })
  })
})
