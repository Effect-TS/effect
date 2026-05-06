/**
 * Vajra Scoring Enhancement Tests
 *
 * Tests commit classification, NDJSON export, cascade analysis,
 * and liveness detection to close Vajra scoring gaps.
 */
import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Ref from "effect/Ref"
import * as Fiber from "effect/Fiber"
import * as Deferred from "effect/Deferred"
import * as DSTScheduler from "effect/DSTScheduler"
import { classifyCommit, computeFixRatio } from "../src/internal/commitClassifier.js"
import { eventLogToNDJSON, analyzeHotFibers } from "../src/internal/cascadeExporter.js"
import { checkLiveness } from "../../effect/src/internal/dst/livenessChecker.js"
import * as fs from "node:fs"
import * as path from "node:path"

const OUTPUT_DIR = path.join(process.cwd(), ".dst-results")

describe("Commit Classification", () => {
  it("classifies conventional commit prefixes", () => {
    expect(classifyCommit("fix(scheduler): handle edge case")).toBe("fix")
    expect(classifyCommit("feat: add DST support")).toBe("feat")
    expect(classifyCommit("feat!: breaking change")).toBe("feat")
    expect(classifyCommit("refactor(core): simplify loop")).toBe("refactor")
    expect(classifyCommit("test: add scheduler tests")).toBe("test")
    expect(classifyCommit("docs: update README")).toBe("docs")
    expect(classifyCommit("chore: bump deps")).toBe("chore")
    expect(classifyCommit("perf(runtime): optimize hot path")).toBe("feat")
    expect(classifyCommit("ci: fix workflow")).toBe("chore")
    expect(classifyCommit("revert: undo last change")).toBe("fix")
  })

  it("classifies by keyword fallback", () => {
    expect(classifyCommit("fixes the race condition")).toBe("fix")
    expect(classifyCommit("bugfix for scheduler")).toBe("fix")
    expect(classifyCommit("resolved the timeout issue")).toBe("fix")
    expect(classifyCommit("add new scheduler API")).toBe("feat")
    expect(classifyCommit("implement DST runner")).toBe("feat")
    expect(classifyCommit("refactor the build system")).toBe("refactor")
    expect(classifyCommit("Version Packages")).toBe("chore")
  })

  it("returns unknown for unclassifiable messages", () => {
    expect(classifyCommit("WIP")).toBe("unknown")
    expect(classifyCommit("stuff")).toBe("unknown")
    expect(classifyCommit("")).toBe("unknown")
  })

  it("computes fix ratio from real Effect commit messages", () => {
    const messages = [
      "fix(cli): prevent --log-level=value from swallowing next argument (#6144)",
      "fix(ai-openrouter): correct HTTP-Referrer header to HTTP-Referer (#6145)",
      "fix: resolve batched request resolver defects hanging consumer fibers (#6139)",
      "Version Packages (#6141)",
      "EFF-749 Backport sql-pg dedicated listen connection (#6140)",
      "feat: add new API endpoint",
      "refactor: simplify internal loop",
      "docs: update migration guide",
      "test: add missing scheduler tests",
    ]

    const result = computeFixRatio(messages)

    expect(result.fixCount).toBe(3)
    expect(result.breakdown.feat).toBe(1)
    expect(result.breakdown.fix).toBe(3)
    expect(result.breakdown.chore).toBe(1)
    expect(result.breakdown.refactor).toBe(1)
    expect(result.breakdown.docs).toBe(1)
    expect(result.breakdown.test).toBe(1)
    expect(result.fixRatio).toBeCloseTo(3 / 8, 2) // 3 fixes / 8 classified
  })
})

describe("Cascade Exporter", () => {
  it("exports event log to valid NDJSON", () => {
    const result = Effect.runSync(
      DSTScheduler.run(
        Effect.race(Effect.succeed("a"), Effect.succeed("b")),
        { seed: 42, maxSteps: 10_000 }
      )
    )

    const ndjson = eventLogToNDJSON(result.eventLog)
    const lines = ndjson.split("\n").filter(l => l.trim())

    expect(lines.length).toBeGreaterThan(0)

    // Every line must be valid JSON with required fields
    for (const line of lines) {
      const obj = JSON.parse(line)
      expect(obj).toHaveProperty("fiberId")
      expect(obj).toHaveProperty("tick")
      expect(obj).toHaveProperty("action")
      expect(["schedule", "execute", "yield", "complete", "interrupt"]).toContain(obj.action)
    }

    // Save for external Vajra analysis
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, "cascade-events.ndjson"), ndjson)
  })

  it("identifies hot fibers from unbalanced workloads", () => {
    const result = Effect.runSync(
      DSTScheduler.run(
        Effect.gen(function*() {
          const ref = yield* Ref.make(0)
          // One fiber does lots of work
          const heavy = yield* Effect.fork(
            Effect.forEach(
              Array.from({ length: 20 }),
              () => Ref.update(ref, (n) => n + 1),
              { concurrency: 1 }
            )
          )
          // One fiber does minimal work
          const light = yield* Effect.fork(Effect.succeed("quick"))

          yield* Fiber.join(heavy)
          yield* Fiber.join(light)
          return yield* Ref.get(ref)
        }),
        { seed: 7, maxSteps: 50_000 }
      )
    )

    const hotFibers = analyzeHotFibers(result.eventLog)

    expect(hotFibers.length).toBeGreaterThan(0)
    // The hottest fiber should have significantly more executions
    expect(hotFibers[0]!.executeCount).toBeGreaterThan(0)
    expect(hotFibers[0]!.percentage).toBeGreaterThan(0)
  })
})

describe("Liveness Detection", () => {
  it("reports healthy for well-behaved effects", () => {
    const result = Effect.runSync(
      DSTScheduler.run(
        Effect.gen(function*() {
          const ref = yield* Ref.make(0)
          const f1 = yield* Effect.fork(Ref.update(ref, (n) => n + 1))
          const f2 = yield* Effect.fork(Ref.update(ref, (n) => n + 1))
          yield* Fiber.join(f1)
          yield* Fiber.join(f2)
          return yield* Ref.get(ref)
        }),
        { seed: 42, maxSteps: 50_000 }
      )
    )

    const report = checkLiveness(result.eventLog)
    expect(report.healthy).toBe(true)
    expect(report.deadlockDetected).toBe(false)
    expect(report.starvation).toHaveLength(0)
    expect(report.infiniteLoops).toHaveLength(0)
  })

  it("provides per-fiber statistics", () => {
    const result = Effect.runSync(
      DSTScheduler.run(
        Effect.gen(function*() {
          const f1 = yield* Effect.fork(Effect.succeed("a"))
          const f2 = yield* Effect.fork(Effect.succeed("b"))
          yield* Fiber.join(f1)
          yield* Fiber.join(f2)
          return "done"
        }),
        { seed: 42, maxSteps: 50_000 }
      )
    )

    const report = checkLiveness(result.eventLog)
    expect(report.fiberStats.length).toBeGreaterThan(0)

    for (const stat of report.fiberStats) {
      expect(stat.fiberId).toBeGreaterThanOrEqual(0)
      expect(stat.executeCount).toBeGreaterThanOrEqual(0)
      expect(stat.scheduleCount).toBeGreaterThan(0)
    }
  })

  it("detects monopolizing fiber as infinite loop", () => {
    // Create a scheduler where one fiber monopolizes by re-scheduling itself
    const scheduler = DSTScheduler.make({ seed: 42, maxSteps: 200 })
    const monopolize = () => {
      scheduler.scheduleTask(monopolize, 0, { id: () => ({ id: 99 }) } as any)
    }
    // Also schedule a victim fiber
    scheduler.scheduleTask(() => {}, 0, { id: () => ({ id: 1 }) } as any)
    scheduler.scheduleTask(monopolize, 0, { id: () => ({ id: 99 }) } as any)

    scheduler.stepUntilDone()

    const report = checkLiveness(scheduler.getEventLog(), {
      loopDetectionWindow: 20,
      loopDominanceThreshold: 0.8
    })

    // The monopolizing fiber (id=99) should be flagged
    expect(report.infiniteLoops.length).toBeGreaterThan(0)
    const monopolizer = report.infiniteLoops.find(l => l.fiberId === 99)
    expect(monopolizer).toBeDefined()
    expect(monopolizer!.dominanceRatio).toBeGreaterThanOrEqual(0.8)
  })
})

describe("Full Vajra Scoring Pipeline", () => {
  it("generates complete scoring data from git log", () => {
    // Get real commit messages from git
    const { execSync } = require("node:child_process") as typeof import("node:child_process")
    let messages: Array<string>

    try {
      const raw = execSync("git log -200 --format='%s'", { encoding: "utf-8", cwd: process.cwd() })
      messages = raw.split("\n").filter(l => l.trim())
    } catch {
      messages = [
        "fix(cli): prevent arg swallowing",
        "feat: add DST support",
        "Version Packages",
        "refactor: simplify build"
      ]
    }

    const result = computeFixRatio(messages)

    // Save scoring data
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "commit-classification.json"),
      JSON.stringify({
        totalCommits: messages.length,
        ...result,
        sampleClassifications: messages.slice(0, 20).map(m => ({
          message: m,
          intent: classifyCommit(m)
        }))
      }, null, 2)
    )

    expect(result.totalClassified).toBeGreaterThan(0)
    expect(result.fixRatio).toBeGreaterThanOrEqual(0)
    expect(result.fixRatio).toBeLessThanOrEqual(1)
  })
})
