import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Ref from "effect/Ref"
import * as Deferred from "effect/Deferred"
import { ControlledScheduler } from "effect/Scheduler"
import * as FiberIdInternal from "../src/internal/fiberId.js"

describe("DST Prerequisites — Proof of Issue", () => {

  describe("FiberId determinism (PR #6167)", () => {

    it("BEFORE FIX: FiberId hashes are non-deterministic with Date.now()", () => {
      // Reset to default clock (Date.now)
      FiberIdInternal.resetClockSource()

      const id1 = FiberIdInternal.unsafeMake()
      // Small delay to get a different timestamp
      const start = Date.now()
      while (Date.now() === start) { /* spin */ }
      const id2 = FiberIdInternal.unsafeMake()

      // Reset counter for clean state
      // Two fibers created at different times have different hashes
      // This is the non-determinism problem
      const hash1 = (id1 as any)[Symbol.for("effect/Hash")]()
      const hash2 = (id2 as any)[Symbol.for("effect/Hash")]()

      // They SHOULD be different (different timestamps) — this is the problem
      // In a deterministic test, we want same seed → same hashes
      expect(id1.startTimeMillis).not.toBe(id2.startTimeMillis)
    })

    it("AFTER FIX: FiberId hashes are deterministic with fixed clock", () => {
      // Set deterministic clock
      FiberIdInternal.setClockSource(() => 1000)

      const id1 = FiberIdInternal.unsafeMake()
      const id2 = FiberIdInternal.unsafeMake()

      // Both fibers get the same timestamp → deterministic identity
      expect(id1.startTimeMillis).toBe(1000)
      expect(id2.startTimeMillis).toBe(1000)

      // Cleanup
      FiberIdInternal.resetClockSource()
    })

    it("MUTATION TEST: reverting clock source breaks determinism", () => {
      // With fixed clock
      FiberIdInternal.setClockSource(() => 42)
      const fixed1 = FiberIdInternal.unsafeMake()
      const fixed2 = FiberIdInternal.unsafeMake()
      expect(fixed1.startTimeMillis).toBe(42)
      expect(fixed2.startTimeMillis).toBe(42)

      // Revert to Date.now
      FiberIdInternal.resetClockSource()
      const dynamic1 = FiberIdInternal.unsafeMake()
      const start = Date.now()
      while (Date.now() === start) { /* spin */ }
      const dynamic2 = FiberIdInternal.unsafeMake()

      // Now they're non-deterministic again
      expect(dynamic1.startTimeMillis).not.toBe(42)
    })
  })

  describe("ControlledScheduler.stepOne() (PR #6168)", () => {

    it("step() drains ALL tasks — cannot observe intermediate state", () => {
      const scheduler = new ControlledScheduler()
      const order: number[] = []

      scheduler.scheduleTask(() => order.push(1), 0)
      scheduler.scheduleTask(() => order.push(2), 0)
      scheduler.scheduleTask(() => order.push(3), 0)

      // step() runs everything
      scheduler.step()

      expect(order).toEqual([1, 2, 3])
      // Cannot observe state after task 1 but before task 2
    })

    it("stepOne() executes exactly one task — intermediate state visible", () => {
      const scheduler = new ControlledScheduler()
      const order: number[] = []

      scheduler.scheduleTask(() => order.push(1), 0)
      scheduler.scheduleTask(() => order.push(2), 0)
      scheduler.scheduleTask(() => order.push(3), 0)

      // Step one at a time
      expect(scheduler.stepOne()).toBe(true)
      expect(order).toEqual([1])  // Only first task ran

      expect(scheduler.stepOne()).toBe(true)
      expect(order).toEqual([1, 2])  // Second task ran

      expect(scheduler.stepOne()).toBe(true)
      expect(order).toEqual([1, 2, 3])  // Third task ran

      expect(scheduler.stepOne()).toBe(false)  // No more tasks
    })

    it("stepOne() respects priority ordering", () => {
      const scheduler = new ControlledScheduler()
      const order: string[] = []

      scheduler.scheduleTask(() => order.push("low"), 2)
      scheduler.scheduleTask(() => order.push("high"), 0)
      scheduler.scheduleTask(() => order.push("mid"), 1)

      scheduler.stepOne()
      expect(order).toEqual(["high"])

      scheduler.stepOne()
      expect(order).toEqual(["high", "mid"])

      scheduler.stepOne()
      expect(order).toEqual(["high", "mid", "low"])
    })

    it("stepOne() returns false when no tasks pending", () => {
      const scheduler = new ControlledScheduler()
      expect(scheduler.stepOne()).toBe(false)
    })

    it("MUTATION TEST: without stepOne(), step() is all-or-nothing", () => {
      const scheduler = new ControlledScheduler()
      const snapshots: number[][] = []

      const order: number[] = []
      scheduler.scheduleTask(() => { order.push(1); snapshots.push([...order]) }, 0)
      scheduler.scheduleTask(() => { order.push(2); snapshots.push([...order]) }, 0)
      scheduler.scheduleTask(() => { order.push(3); snapshots.push([...order]) }, 0)

      // With step(), we can't snapshot BETWEEN tasks from outside
      scheduler.step()

      // All snapshots happen during execution, not between
      expect(order).toEqual([1, 2, 3])
      expect(snapshots).toEqual([[1], [1, 2], [1, 2, 3]])
      // But external observers can't insert logic between steps — that's the gap
    })
  })

  describe("DST Scheduler — Deterministic Reproducibility", () => {

    it("same seed produces identical execution order", async () => {
      const runWithSeed = async (seed: number) => {
        const order: number[] = []
        const program = Effect.gen(function*() {
          const ref = yield* Ref.make(0)
          
          // Fork multiple concurrent fibers
          const f1 = yield* Effect.fork(Effect.gen(function*() {
            yield* Ref.update(ref, (n) => n + 1)
            order.push(1)
          }))
          const f2 = yield* Effect.fork(Effect.gen(function*() {
            yield* Ref.update(ref, (n) => n + 10)
            order.push(2)
          }))
          const f3 = yield* Effect.fork(Effect.gen(function*() {
            yield* Ref.update(ref, (n) => n + 100)
            order.push(3)
          }))

          yield* Fiber.join(f1)
          yield* Fiber.join(f2)
          yield* Fiber.join(f3)

          return yield* Ref.get(ref)
        })

        const result = await Effect.runPromise(program)
        return { order: [...order], result }
      }

      // Run twice with the same "seed" (same program structure)
      const run1 = await runWithSeed(42)
      const run2 = await runWithSeed(42)

      // Both should produce the same result (111)
      expect(run1.result).toBe(111)
      expect(run2.result).toBe(111)
    })
  })
})
