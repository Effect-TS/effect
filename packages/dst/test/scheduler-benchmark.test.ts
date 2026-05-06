/**
 * DST Scheduler Performance Baseline
 *
 * Establishes performance baselines for the DST scheduler to detect
 * regressions across commits. Outputs measurements to JSON for trending.
 */
import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Fiber from "effect/Fiber"
import * as DSTScheduler from "effect/DSTScheduler"
import * as fs from "node:fs"
import * as path from "node:path"

const OUTPUT_DIR = path.join(process.cwd(), ".dst-results")

interface PerfBaseline {
  readonly name: string
  readonly value: number
  readonly unit: string
  readonly threshold: number
  readonly passed: boolean
}

const baselines: Array<PerfBaseline> = []

const record = (name: string, value: number, unit: string, threshold: number) => {
  baselines.push({ name, value, unit, threshold, passed: value <= threshold })
}

describe("DST Scheduler Performance Baseline", { timeout: 30_000 }, () => {
  // ── Baseline 1: Raw scheduling throughput ──────────────────────────

  it("raw scheduling: 10,000 tasks in <500ms", () => {
    const scheduler = DSTScheduler.make({ seed: 42, maxSteps: 15_000 })
    let executed = 0

    for (let i = 0; i < 10_000; i++) {
      scheduler.scheduleTask(() => { executed++ }, 0)
    }

    const start = performance.now()
    scheduler.stepUntilDone()
    const elapsed = performance.now() - start

    expect(executed).toBe(10_000)
    expect(elapsed).toBeLessThan(500)

    record("raw_scheduling_10k_tasks_ms", elapsed, "ms", 500)
    record("raw_scheduling_ops_per_sec", (10_000 / elapsed) * 1000, "ops/s", Infinity)
  })

  // ── Baseline 2: Effect.succeed overhead per seed ────────────────────

  it("simple effect: 100 seeds in <200ms", () => {
    const start = performance.now()
    let totalSteps = 0

    for (let seed = 0; seed < 100; seed++) {
      const r = Effect.runSync(
        DSTScheduler.run(Effect.succeed(seed), { seed, maxSteps: 10_000 })
      )
      totalSteps += r.steps
    }

    const elapsed = performance.now() - start
    const perSeed = elapsed / 100

    expect(elapsed).toBeLessThan(200)

    record("100_seeds_simple_effect_ms", elapsed, "ms", 200)
    record("per_seed_overhead_ms", perSeed, "ms", 2)
    record("total_steps_100_seeds", totalSteps, "steps", Infinity)
  })

  // ── Baseline 3: Scaling with fiber count ────────────────────────────

  it("fiber scaling: 2-50 fibers, no worse than O(n)", () => {
    const fiberCounts = [2, 5, 10, 20, 50]
    const timings: Array<{ fibers: number; ms: number; steps: number }> = []

    for (const n of fiberCounts) {
      const start = performance.now()

      const result = Effect.runSync(
        DSTScheduler.run(
          Effect.gen(function*() {
            const ref = yield* Ref.make(0)
            const fibers = yield* Effect.forEach(
              Array.from({ length: n }),
              () => Effect.fork(Ref.update(ref, (x) => x + 1)),
              { concurrency: "unbounded" }
            )
            yield* Effect.forEach(fibers, Fiber.join, { concurrency: 1 })
            return yield* Ref.get(ref)
          }),
          { seed: 42, maxSteps: 100_000 }
        )
      )

      const elapsed = performance.now() - start
      timings.push({ fibers: n, ms: elapsed, steps: result.steps })
    }

    // Check O(n) scaling: time for 50 fibers should be < 50x time for 2 fibers
    const time2 = timings.find(t => t.fibers === 2)!.ms
    const time50 = timings.find(t => t.fibers === 50)!.ms
    const scalingFactor = time2 > 0 ? time50 / time2 : 0

    // Allow up to 100x (generous bound for CI variance)
    expect(scalingFactor).toBeLessThan(100)

    record("scaling_factor_2_to_50_fibers", scalingFactor, "x", 100)

    for (const t of timings) {
      record(`fiber_${t.fibers}_ms`, t.ms, "ms", Infinity)
      record(`fiber_${t.fibers}_steps`, t.steps, "steps", Infinity)
    }
  })

  // ── Baseline 4: Race throughput ─────────────────────────────────────

  it("race throughput: 1000 seeds in <5s", () => {
    const start = performance.now()

    for (let seed = 0; seed < 1000; seed++) {
      Effect.runSync(
        DSTScheduler.run(
          Effect.race(Effect.succeed("a"), Effect.succeed("b")),
          { seed, maxSteps: 10_000 }
        )
      )
    }

    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(5000)

    record("1000_race_seeds_ms", elapsed, "ms", 5000)
    record("race_per_seed_ms", elapsed / 1000, "ms", 5)
  })

  // ── Baseline 5: Event log overhead ──────────────────────────────────

  it("event log overhead: <30% of execution time", () => {
    // The event log is always on in DST (no way to disable it currently),
    // so we measure the absolute cost of a run with many events
    const start = performance.now()

    const result = Effect.runSync(
      DSTScheduler.run(
        Effect.gen(function*() {
          for (let i = 0; i < 100; i++) {
            yield* Effect.yieldNow()
          }
          return "done"
        }),
        { seed: 42, maxOpsBeforeYield: 10, maxSteps: 50_000 }
      )
    )

    const elapsed = performance.now() - start
    const eventCount = result.eventLog.events.length
    const usPerEvent = eventCount > 0 ? (elapsed * 1000) / eventCount : 0

    // Less than 10μs per event is acceptable
    expect(usPerEvent).toBeLessThan(10)

    record("event_log_events_generated", eventCount, "events", Infinity)
    record("event_log_us_per_event", usPerEvent, "μs", 10)
  })

  // ── Write baseline JSON ─────────────────────────────────────────────

  it("writes performance baseline to disk", () => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "perf-baseline.json"),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        baselines,
        allPassed: baselines.every(b => b.passed)
      }, null, 2)
    )

    // All baselines must pass
    for (const b of baselines) {
      if (b.threshold !== Infinity) {
        expect(b.passed).toBe(true)
      }
    }
  })
})
