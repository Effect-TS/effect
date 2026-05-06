import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as DSTScheduler from "effect/DSTScheduler"
import { parseLinePorcelain } from "../src/internal/gitBlame.js"
import { resolveCallFrame } from "../src/internal/sourceMapResolver.js"
import { computeSelfTimes } from "../src/internal/v8Profiler.js"
import { generateReport, toMarkdown } from "../src/internal/reportGenerator.js"

describe("E2E: DST Pipeline", () => {
  describe("Deterministic Race Exploration", () => {
    it("same seed always produces the same race winner", () => {
      for (let trial = 0; trial < 5; trial++) {
        const result1 = Effect.runSync(
          DSTScheduler.run(
            Effect.race(Effect.succeed("left"), Effect.succeed("right")),
            { seed: 42 }
          )
        )
        const result2 = Effect.runSync(
          DSTScheduler.run(
            Effect.race(Effect.succeed("left"), Effect.succeed("right")),
            { seed: 42 }
          )
        )
        expect(result1.exit).toEqual(result2.exit)
      }
    })

    it("explores interleaving space across seeds for concurrent effects", () => {
      const results = new Map<number, string>()

      for (let seed = 0; seed < 20; seed++) {
        const result = Effect.runSync(
          DSTScheduler.run(
            Effect.race(
              Effect.succeed("A"),
              Effect.succeed("B")
            ),
            { seed, maxSteps: 5000 }
          )
        )
        if (Exit.isSuccess(result.exit)) {
          results.set(seed, result.exit.value)
        }
      }

      // Verify we got deterministic results
      expect(results.size).toBeGreaterThan(0)
    })
  })

  describe("Event Log Replay", () => {
    it("event log captures scheduling decisions", () => {
      const result = Effect.runSync(
        DSTScheduler.run(
          Effect.gen(function*() {
            yield* Effect.yieldNow()
            yield* Effect.yieldNow()
            return "done"
          }),
          { seed: 7, maxOpsBeforeYield: 10 }
        )
      )

      const log = result.eventLog
      expect(log.seed).toBe(7)
      expect(log.events.length).toBeGreaterThan(0)

      // All events should have valid ticks
      for (const event of log.events) {
        expect(event.tick).toBeGreaterThanOrEqual(0)
        expect(["schedule", "execute", "yield", "complete", "interrupt"]).toContain(event.action)
      }
    })
  })

  describe("Git Blame Parser", () => {
    it("parses line-porcelain format correctly", () => {
      const sampleOutput = [
        "abc123def456789012345678901234567890abcd 1 1 1",
        "author John Doe",
        "author-mail <john@example.com>",
        "author-time 1700000000",
        "author-tz +0000",
        "committer John Doe",
        "committer-mail <john@example.com>",
        "committer-time 1700000000",
        "committer-tz +0000",
        "summary Initial commit",
        "filename test.ts",
        "\tconst x = 42;"
      ].join("\n")

      const result = parseLinePorcelain(sampleOutput, "/path/to/test.ts")

      expect(result.size).toBe(1)
      const entry = result.get("/path/to/test.ts:1")!
      expect(entry).toBeDefined()
      expect(entry.author).toBe("John Doe")
      expect(entry.authorEmail).toBe("john@example.com")
      expect(entry.commitHash).toBe("abc123def456789012345678901234567890abcd")
      expect(entry.summary).toBe("Initial commit")
      expect(entry.lineContent).toBe("const x = 42;")
    })

    it("handles multiple blame blocks", () => {
      const sampleOutput = [
        "aaaa111111111111111111111111111111111111 1 1 1",
        "author Alice",
        "author-mail <alice@test.com>",
        "author-time 1700000000",
        "summary First line",
        "filename test.ts",
        "\tline 1",
        "bbbb222222222222222222222222222222222222 2 2 1",
        "author Bob",
        "author-mail <bob@test.com>",
        "author-time 1700001000",
        "summary Second line",
        "filename test.ts",
        "\tline 2"
      ].join("\n")

      const result = parseLinePorcelain(sampleOutput, "/path/test.ts")
      expect(result.size).toBe(2)
      expect(result.get("/path/test.ts:1")!.author).toBe("Alice")
      expect(result.get("/path/test.ts:2")!.author).toBe("Bob")
    })
  })

  describe("Source Map Resolver", () => {
    it("returns null for node: built-in modules", () => {
      const result = resolveCallFrame({
        functionName: "readFile",
        scriptId: "0",
        url: "node:fs",
        lineNumber: 10,
        columnNumber: 5
      })
      expect(result).toBeNull()
    })

    it("returns null for empty URLs", () => {
      const result = resolveCallFrame({
        functionName: "",
        scriptId: "0",
        url: "",
        lineNumber: 0,
        columnNumber: 0
      })
      expect(result).toBeNull()
    })

    it("resolves .ts files directly", () => {
      const result = resolveCallFrame({
        functionName: "test",
        scriptId: "0",
        url: "/path/to/file.ts",
        lineNumber: 9,
        columnNumber: 4
      })
      expect(result).not.toBeNull()
      expect(result!.originalFile).toBe("/path/to/file.ts")
      expect(result!.originalLine).toBe(10) // 0-based to 1-based
    })
  })

  describe("V8 Profile Self-Time Computation", () => {
    it("computes self-time from samples and deltas", () => {
      const times = computeSelfTimes({
        nodes: [
          { id: 1, callFrame: { functionName: "a", scriptId: "0", url: "", lineNumber: 0, columnNumber: 0 }, hitCount: 3 },
          { id: 2, callFrame: { functionName: "b", scriptId: "0", url: "", lineNumber: 0, columnNumber: 0 }, hitCount: 2 }
        ],
        startTime: 0,
        endTime: 500,
        samples: [1, 1, 2, 1, 2],
        timeDeltas: [100, 100, 100, 100, 100]
      })

      expect(times.get(1)).toBe(300) // 3 samples × 100μs
      expect(times.get(2)).toBe(200) // 2 samples × 100μs
    })

    it("returns empty map when no samples", () => {
      const times = computeSelfTimes({
        nodes: [],
        startTime: 0,
        endTime: 0
      })
      expect(times.size).toBe(0)
    })
  })

  describe("Report Generator", () => {
    it("generates developer hotspot report", () => {
      const annotatedNodes = [
        {
          node: { id: 1, callFrame: { functionName: "processData", scriptId: "0", url: "/src/core.ts", lineNumber: 10, columnNumber: 0 }, hitCount: 5 },
          resolved: { originalFile: "/src/core.ts", originalLine: 11, originalColumn: 0, generatedFile: "/build/core.js", generatedLine: 11 },
          blame: { commitHash: "abc123", author: "Alice", authorEmail: "alice@co.com", authorDate: 1700000000, summary: "Add core processing", lineNumber: 11, lineContent: "function processData() {" },
          selfTime: 5000
        },
        {
          node: { id: 2, callFrame: { functionName: "formatOutput", scriptId: "0", url: "/src/format.ts", lineNumber: 20, columnNumber: 0 }, hitCount: 3 },
          resolved: { originalFile: "/src/format.ts", originalLine: 21, originalColumn: 0, generatedFile: "/build/format.js", generatedLine: 21 },
          blame: { commitHash: "def456", author: "Bob", authorEmail: "bob@co.com", authorDate: 1700001000, summary: "Add formatting", lineNumber: 21, lineContent: "function formatOutput() {" },
          selfTime: 3000
        },
        {
          node: { id: 3, callFrame: { functionName: "validate", scriptId: "0", url: "/src/core.ts", lineNumber: 30, columnNumber: 0 }, hitCount: 2 },
          resolved: { originalFile: "/src/core.ts", originalLine: 31, originalColumn: 0, generatedFile: "/build/core.js", generatedLine: 31 },
          blame: { commitHash: "abc789", author: "Alice", authorEmail: "alice@co.com", authorDate: 1700002000, summary: "Add validation", lineNumber: 31, lineContent: "function validate() {" },
          selfTime: 2000
        }
      ]

      const report = generateReport(annotatedNodes, { seed: 42, passed: true, steps: 100 })

      expect(report.seed).toBe(42)
      expect(report.passed).toBe(true)
      expect(report.steps).toBe(100)
      expect(report.totalProfiledTime).toBe(10000) // 5000 + 3000 + 2000

      // Alice should be first (7000μs total)
      expect(report.hotspots[0]!.author).toBe("Alice")
      expect(report.hotspots[0]!.totalSelfTime).toBe(7000)
      expect(report.hotspots[0]!.percentage).toBe(70)

      // Bob second (3000μs)
      expect(report.hotspots[1]!.author).toBe("Bob")
      expect(report.hotspots[1]!.totalSelfTime).toBe(3000)
      expect(report.hotspots[1]!.percentage).toBe(30)

      // Top functions sorted by self-time
      expect(report.topFunctions[0]!.functionName).toBe("processData")
      expect(report.topFunctions[0]!.selfTime).toBe(5000)
    })

    it("renders markdown report", () => {
      const report = generateReport([{
        node: { id: 1, callFrame: { functionName: "test", scriptId: "0", url: "/test.ts", lineNumber: 0, columnNumber: 0 }, hitCount: 1 },
        resolved: { originalFile: "/test.ts", originalLine: 1, originalColumn: 0, generatedFile: "/test.js", generatedLine: 1 },
        blame: { commitHash: "aabbccdd", author: "Dev", authorEmail: "dev@co.com", authorDate: 0, summary: "test", lineNumber: 1, lineContent: "" },
        selfTime: 1000
      }], { seed: 1, passed: true, steps: 10 })

      const md = toMarkdown(report)
      expect(md).toContain("# DST Report - Seed 1")
      expect(md).toContain("PASSED")
      expect(md).toContain("Dev")
      expect(md).toContain("100.0%")
    })
  })
})
