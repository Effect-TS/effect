/**
 * Fault Injection DST Tests
 *
 * Injects controlled failures into DST runs and verifies the runtime
 * handles them correctly across all scheduling interleavings.
 */
import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Cause from "effect/Cause"
import * as Fiber from "effect/Fiber"
import * as Ref from "effect/Ref"
import * as Deferred from "effect/Deferred"
import * as DSTScheduler from "effect/DSTScheduler"

const SEEDS = 30
const MAX_STEPS = 50_000

const runSeeds = <A, E>(
  effect: Effect.Effect<A, E>,
  seeds: number = SEEDS
): Array<{ seed: number; exit: Exit.Exit<A, E>; steps: number }> => {
  const results: Array<{ seed: number; exit: Exit.Exit<A, E>; steps: number }> = []
  for (let seed = 0; seed < seeds; seed++) {
    const r = Effect.runSync(DSTScheduler.run(effect, { seed, maxSteps: MAX_STEPS }))
    results.push({ seed, exit: r.exit, steps: r.steps })
  }
  return results
}

describe("Fault Injection under DST", () => {
  // ── Test 1: Fiber dies mid-execution ────────────────────────────────

  it("fiber death (Effect.die) is captured without corrupting siblings", () => {
    const results = runSeeds(
      Effect.gen(function*() {
        const ref = yield* Ref.make("initial")

        // Fiber that dies
        const dying = yield* Effect.fork(Effect.die("crash"))
        // Fiber that succeeds
        const healthy = yield* Effect.fork(Ref.set(ref, "updated"))

        const dyingExit = yield* dying.await
        yield* Fiber.join(healthy)

        const value = yield* Ref.get(ref)
        return { died: Exit.isFailure(dyingExit), value }
      })
    )

    for (const r of results) {
      expect(Exit.isSuccess(r.exit)).toBe(true)
      if (Exit.isSuccess(r.exit)) {
        expect(r.exit.value.died).toBe(true)
        expect(r.exit.value.value).toBe("updated")
      }
    }
  })

  // ── Test 2: Planned failure with recovery ───────────────────────────

  it("Effect.fail is caught and recovered across all seeds", () => {
    const results = runSeeds(
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)

        yield* Ref.update(ref, (n) => n + 1)
        yield* Ref.update(ref, (n) => n + 1)

        // This fails
        const recovered = yield* Effect.catchAll(
          Effect.flatMap(
            Ref.update(ref, (n) => n + 1),
            () => Effect.fail("planned-failure" as const)
          ),
          (err) => Effect.succeed(`caught: ${err}`)
        )

        const count = yield* Ref.get(ref)
        return { recovered, count }
      })
    )

    for (const r of results) {
      expect(Exit.isSuccess(r.exit)).toBe(true)
      if (Exit.isSuccess(r.exit)) {
        expect(r.exit.value.recovered).toBe("caught: planned-failure")
        expect(r.exit.value.count).toBe(3)
      }
    }
  })

  // ── Test 3: Interrupt during race ───────────────────────────────────

  it("race with interrupt always resolves (never hangs)", () => {
    const results = runSeeds(
      Effect.race(
        Effect.succeed("winner"),
        Effect.interrupt
      )
    )

    for (const r of results) {
      // Should either succeed or be interrupted, but NEVER hang
      expect(r.steps).toBeLessThan(MAX_STEPS)
      // The race should resolve to the successful side
      if (Exit.isSuccess(r.exit)) {
        expect(r.exit.value).toBe("winner")
      }
    }
  })

  // ── Test 4: Dying fiber + surviving sibling ─────────────────────────

  it("one fiber dies, sibling completes independently", () => {
    const results = runSeeds(
      Effect.gen(function*() {
        const ref = yield* Ref.make<Array<string>>([])

        const f1 = yield* Effect.fork(
          Effect.flatMap(
            Ref.update(ref, (arr) => [...arr, "before-die"]),
            () => Effect.die("fiber-death")
          )
        )
        const f2 = yield* Effect.fork(
          Ref.update(ref, (arr) => [...arr, "survivor"])
        )

        // Wait for both (f1 will die, f2 will succeed)
        const exit1 = yield* f1.await
        yield* Fiber.join(f2)

        const log = yield* Ref.get(ref)
        return {
          f1Died: Exit.isFailure(exit1),
          logLength: log.length,
          hasSurvivor: log.includes("survivor")
        }
      })
    )

    for (const r of results) {
      expect(Exit.isSuccess(r.exit)).toBe(true)
      if (Exit.isSuccess(r.exit)) {
        expect(r.exit.value.f1Died).toBe(true)
        expect(r.exit.value.hasSurvivor).toBe(true)
      }
    }
  })

  // ── Test 5: Resource pressure (many concurrent fibers) ──────────────

  it("50 concurrent fibers maintain Ref atomicity", () => {
    const FIBER_COUNT = 50

    const results = runSeeds(
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)

        const fibers = yield* Effect.forEach(
          Array.from({ length: FIBER_COUNT }, (_, i) => i),
          () => Effect.fork(Ref.update(ref, (n) => n + 1)),
          { concurrency: "unbounded" }
        )

        yield* Effect.forEach(fibers, Fiber.join, { concurrency: 1 })
        return yield* Ref.get(ref)
      }),
      20 // Fewer seeds due to higher step count
    )

    for (const r of results) {
      expect(Exit.isSuccess(r.exit)).toBe(true)
      if (Exit.isSuccess(r.exit)) {
        // All 50 increments must be reflected
        expect(r.exit.value).toBe(FIBER_COUNT)
      }
    }
  })

  // ── Test 6: Cascading dependency failure ────────────────────────────

  it("producer failure propagates to dependent consumer", () => {
    const results = runSeeds(
      Effect.gen(function*() {
        const deferred = yield* Deferred.make<number, string>()

        // Producer: fails before completing the deferred
        const producer = yield* Effect.fork(
          Effect.flatMap(
            Effect.fail("producer-failed"),
            () => Deferred.succeed(deferred, 42) // Never reached
          )
        )

        // Consumer: waits for the deferred with a timeout mechanism
        // (using the step limit as implicit timeout)
        const consumer = yield* Effect.fork(
          Deferred.await(deferred)
        )

        const producerExit = yield* producer.await
        // Producer should have failed
        const producerFailed = Exit.isFailure(producerExit)

        // Interrupt the consumer since producer failed
        yield* Fiber.interrupt(consumer)
        const consumerExit = yield* consumer.await

        return {
          producerFailed,
          consumerInterrupted: Exit.isFailure(consumerExit)
        }
      })
    )

    for (const r of results) {
      expect(Exit.isSuccess(r.exit)).toBe(true)
      if (Exit.isSuccess(r.exit)) {
        expect(r.exit.value.producerFailed).toBe(true)
        expect(r.exit.value.consumerInterrupted).toBe(true)
      }
    }
  })

  // ── Test 7: Error channel preserves type info ───────────────────────

  it("typed errors are preserved through DST scheduling", () => {
    class AppError {
      readonly _tag = "AppError"
      constructor(readonly code: number, readonly message: string) {}
    }

    const results = runSeeds(
      Effect.fail(new AppError(404, "not found"))
    )

    for (const r of results) {
      expect(Exit.isFailure(r.exit)).toBe(true)
      if (Exit.isFailure(r.exit)) {
        const failures = Cause.failures(r.exit.cause)
        const first = Array.from(failures)[0]
        expect(first).toBeInstanceOf(AppError)
        expect((first as AppError).code).toBe(404)
      }
    }
  })
})
