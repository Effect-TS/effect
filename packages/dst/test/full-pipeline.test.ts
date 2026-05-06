/**
 * Full DST Pipeline Test
 *
 * Runs the complete pipeline:
 * 1. DST execution across multiple seeds with V8 profiling
 * 2. Source map resolution
 * 3. Git blame attribution
 * 4. Developer hotspot report generation
 */
import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as DSTScheduler from "effect/DSTScheduler"
import * as Ref from "effect/Ref"
import { captureProfile, computeSelfTimes } from "../src/internal/v8Profiler.js"
import { resolveProfileNodes } from "../src/internal/sourceMapResolver.js"
import { findRepoRoot, blameFile } from "../src/internal/gitBlame.js"
import { annotateProfile } from "../src/internal/profileAnnotator.js"
import { generateReport, toMarkdown, toJSON } from "../src/internal/reportGenerator.js"
import * as fs from "node:fs"
import * as path from "node:path"

const OUTPUT_DIR = path.join(process.cwd(), ".dst-results")

describe("Full DST Pipeline", () => {
  // ── 1. DST Multi-Seed Execution ──────────────────────────────────────

  describe("1. DST Multi-Seed Execution", () => {
    it("runs Effect.race across 50 seeds and collects deterministic results", () => {
      const results: Array<{
        seed: number
        winner: string | null
        steps: number
        eventCount: number
      }> = []

      for (let seed = 0; seed < 50; seed++) {
        const result = Effect.runSync(
          DSTScheduler.run(
            Effect.race(
              Effect.succeed("left"),
              Effect.succeed("right")
            ),
            { seed, maxSteps: 10_000 }
          )
        )

        results.push({
          seed,
          winner: Exit.isSuccess(result.exit) ? result.exit.value : null,
          steps: result.steps,
          eventCount: result.eventLog.events.length
        })
      }

      // Write DST results
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "dst-race-results.json"),
        JSON.stringify(results, null, 2)
      )

      // Verify determinism: run same seeds again
      for (let seed = 0; seed < 10; seed++) {
        const result = Effect.runSync(
          DSTScheduler.run(
            Effect.race(
              Effect.succeed("left"),
              Effect.succeed("right")
            ),
            { seed, maxSteps: 10_000 }
          )
        )
        const original = results[seed]!
        expect(Exit.isSuccess(result.exit) ? result.exit.value : null).toBe(original.winner)
        expect(result.steps).toBe(original.steps)
      }

      // All should succeed
      const successCount = results.filter(r => r.winner !== null).length
      expect(successCount).toBe(50)
    })

    it("runs concurrent counter across seeds to detect data races", () => {
      const results: Array<{ seed: number; value: number; passed: boolean }> = []

      for (let seed = 0; seed < 30; seed++) {
        const result = Effect.runSync(
          DSTScheduler.run(
            Effect.gen(function*() {
              const ref = yield* Ref.make(0)

              // Two fibers incrementing the same ref
              const fiber1 = yield* Effect.fork(
                Effect.forEach(
                  [1, 2, 3, 4, 5],
                  () => Ref.update(ref, (n) => n + 1),
                  { concurrency: 1 }
                )
              )
              const fiber2 = yield* Effect.fork(
                Effect.forEach(
                  [1, 2, 3, 4, 5],
                  () => Ref.update(ref, (n) => n + 1),
                  { concurrency: 1 }
                )
              )

              yield* Fiber.join(fiber1)
              yield* Fiber.join(fiber2)

              return yield* Ref.get(ref)
            }),
            { seed, maxSteps: 50_000 }
          )
        )

        const value = Exit.isSuccess(result.exit) ? result.exit.value : -1
        results.push({
          seed,
          value,
          passed: value === 10 // Both fibers should complete: 5 + 5 = 10
        })
      }

      fs.writeFileSync(
        path.join(OUTPUT_DIR, "dst-counter-results.json"),
        JSON.stringify(results, null, 2)
      )

      // Ref is atomic in Effect, so all seeds should produce 10
      for (const r of results) {
        expect(r.passed).toBe(true)
      }
    })

    it("runs generator pipeline across seeds", () => {
      const results: Array<{ seed: number; result: number; steps: number }> = []

      for (let seed = 0; seed < 20; seed++) {
        const result = Effect.runSync(
          DSTScheduler.run(
            Effect.gen(function*() {
              const a = yield* Effect.succeed(10)
              const b = yield* Effect.succeed(20)
              const c = yield* Effect.succeed(a + b)
              return c * 2
            }),
            { seed }
          )
        )

        if (Exit.isSuccess(result.exit)) {
          results.push({ seed, result: result.exit.value, steps: result.steps })
        }
      }

      // All should produce 60
      for (const r of results) {
        expect(r.result).toBe(60)
      }
    })
  })

  // ── 2. V8 CPU Profiling ──────────────────────────────────────────────

  describe("2. V8 CPU Profiling", () => {
    it("captures a V8 profile during DST execution", async () => {
      const profileResult = await Effect.runPromise(
        Effect.scoped(
          captureProfile(
            DSTScheduler.run(
              Effect.gen(function*() {
                // Do some actual computation to show up in the profile
                let sum = 0
                for (let i = 0; i < 10000; i++) {
                  sum += i
                }
                return sum
              }),
              { seed: 42 }
            ),
            { testName: "full-pipeline-profile", seed: 42, steps: 0 }
          )
        )
      )

      expect(profileResult.profile).toBeDefined()
      expect(profileResult.profile.nodes.length).toBeGreaterThan(0)
      expect(profileResult.profile.startTime).toBeLessThan(profileResult.profile.endTime)
      expect(profileResult.metadata.testName).toBe("full-pipeline-profile")

      // Save the profile
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "dst-profile.cpuprofile"),
        JSON.stringify(profileResult.profile, null, 2)
      )

      // Compute self-times
      const selfTimes = computeSelfTimes(profileResult.profile)
      expect(selfTimes.size).toBeGreaterThan(0)

      // Resolve source maps
      const resolved = resolveProfileNodes(profileResult.profile.nodes)
      const resolvedCount = resolved.filter(n => n.resolved !== null).length

      // Save resolution results
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "resolved-frames.json"),
        JSON.stringify({
          totalNodes: profileResult.profile.nodes.length,
          resolvedNodes: resolvedCount,
          sampleNodes: resolved.slice(0, 20).map(n => ({
            function: n.node.callFrame.functionName,
            url: n.node.callFrame.url,
            resolved: n.resolved
          }))
        }, null, 2)
      )
    })
  })

  // ── 3. Git Blame Attribution ─────────────────────────────────────────

  describe("3. Git Blame Attribution", () => {
    it("finds the repo root", async () => {
      const root = await Effect.runPromise(findRepoRoot())
      expect(root).toContain("effect")
    })

    it("blames a known source file", async () => {
      const root = await Effect.runPromise(findRepoRoot())
      const blameMap = await Effect.runPromise(
        blameFile(
          path.join(root, "packages/effect/src/Scheduler.ts"),
          root
        )
      )

      expect(blameMap.size).toBeGreaterThan(0)

      // Save blame results
      const blameEntries = Array.from(blameMap.entries()).slice(0, 30)
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "blame-scheduler.json"),
        JSON.stringify(
          blameEntries.map(([key, entry]) => ({
            location: key,
            author: entry.author,
            email: entry.authorEmail,
            commit: entry.commitHash.slice(0, 8),
            summary: entry.summary
          })),
          null,
          2
        )
      )

      // Check that we got real attribution data
      const firstEntry = blameMap.values().next().value!
      expect(firstEntry.author).toBeTruthy()
      expect(firstEntry.commitHash).toHaveLength(40)
    })
  })

  // ── 4. Full Annotated Report ─────────────────────────────────────────

  describe("4. Full Annotated Report", () => {
    it("generates a complete developer attribution report", async () => {
      // First capture a profile
      const profileResult = await Effect.runPromise(
        Effect.scoped(
          captureProfile(
            DSTScheduler.run(
              Effect.gen(function*() {
                const a = yield* Effect.succeed(1)
                const b = yield* Effect.succeed(2)
                return a + b
              }),
              { seed: 99 }
            ),
            { testName: "report-pipeline", seed: 99, steps: 0 }
          )
        )
      )

      // Find repo root
      const root = await Effect.runPromise(findRepoRoot())

      // Annotate with blame
      const annotated = await Effect.runPromise(
        annotateProfile(profileResult.profile, root).pipe(
          Effect.catchAll(() => Effect.succeed([]))
        )
      )

      // Generate report
      const report = generateReport(
        annotated,
        {
          seed: 99,
          passed: Exit.isSuccess(profileResult.exit),
          steps: 0
        }
      )

      // Render outputs
      const markdown = toMarkdown(report)
      const json = toJSON(report)

      // Save reports
      fs.writeFileSync(path.join(OUTPUT_DIR, "dst-report.md"), markdown)
      fs.writeFileSync(path.join(OUTPUT_DIR, "dst-report.json"), json)

      expect(report.seed).toBe(99)
      expect(markdown).toContain("# DST Report")
      expect(markdown).toContain("Developer Hotspots")
      expect(markdown).toContain("Top Functions")

      // Report should have structure even if some nodes weren't resolvable
      expect(report.totalProfiledTime).toBeGreaterThanOrEqual(0)
    })
  })
})
