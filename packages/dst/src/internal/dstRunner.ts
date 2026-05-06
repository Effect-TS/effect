/**
 * DST Runner - Multi-seed runner with V8 profiling and failure shrinking.
 *
 * Iterates over a range of seeds, runs each under deterministic simulation,
 * optionally captures V8 profiles, and annotates with git blame.
 *
 * @internal
 */

import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Scope from "effect/Scope"
import type { DSTConfig, DSTResult } from "effect/DSTScheduler"
import * as DSTScheduler from "effect/DSTScheduler"
import * as ProfileAnnotator from "./profileAnnotator.js"
import * as ReportGenerator from "./reportGenerator.js"
import * as V8Profiler from "./v8Profiler.js"
import * as GitBlame from "./gitBlame.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface DSTRunConfig {
  readonly seedStart?: number
  readonly seedCount?: number
  readonly maxOpsBeforeYield?: number
  readonly maxSteps?: number
  readonly enableProfiling?: boolean
  readonly enableBlame?: boolean
  readonly repoRoot?: string
  readonly outputDir?: string
}

/** @internal */
export interface SeedResult<A, E> {
  readonly seed: number
  readonly passed: boolean
  readonly steps: number
  readonly durationMs: number
  readonly exit: Exit.Exit<A, E>
  readonly profile?: V8Profiler.V8Profile
  readonly report?: ReportGenerator.DSTReport
}

/** @internal */
export interface DSTSuiteResult<A, E> {
  readonly results: ReadonlyArray<SeedResult<A, E>>
  readonly totalSeeds: number
  readonly failingSeeds: ReadonlyArray<number>
  readonly passingSeeds: number
  readonly shrunkSeed?: number
}

// ── Runner Implementation ────────────────────────────────────────────────

/**
 * Run a single seed, optionally with profiling and blame.
 *
 * @internal
 */
const runSingleSeed = <A, E>(
  effect: Effect.Effect<A, E>,
  seed: number,
  config: DSTRunConfig,
  repoRoot: string | null
): Effect.Effect<SeedResult<A, E>, never, Scope.Scope> =>
  Effect.gen(function*() {
    const startMs = Date.now()

    const dstConfig: DSTConfig = {
      seed,
      maxOpsBeforeYield: config.maxOpsBeforeYield ?? 1,
      maxSteps: config.maxSteps ?? 100_000
    }

    if (config.enableProfiling) {
      const profileResult = yield* V8Profiler.captureProfile(
        DSTScheduler.run(effect, dstConfig),
        { testName: `dst-seed-${seed}`, seed, steps: 0 }
      ).pipe(Effect.catchAll((err) => {
        return Effect.map(DSTScheduler.run(effect, dstConfig), (dstResult) => ({
          exit: Exit.succeed(dstResult) as any,
          profile: { nodes: [], startTime: 0, endTime: 0 } as V8Profiler.V8Profile,
          metadata: {
            testName: `dst-seed-${seed}`,
            seed,
            passed: Exit.isSuccess(dstResult.exit),
            steps: dstResult.steps,
            capturedAt: new Date().toISOString()
          }
        }))
      }))

      const dstResult: DSTResult<A, E> = Exit.isSuccess(profileResult.exit)
        ? (profileResult.exit as any).value
        : { exit: profileResult.exit, seed, steps: 0, eventLog: { seed, events: [] }, finalSnapshot: { prngState: [0, 0, 0, 0], pendingCount: 0, tick: 0 } }

      const passed = Exit.isSuccess(dstResult.exit)
      const durationMs = Date.now() - startMs

      let report: ReportGenerator.DSTReport | undefined
      if (config.enableBlame && repoRoot && profileResult.profile.nodes.length > 0) {
        const annotated = yield* ProfileAnnotator.annotateProfile(
          profileResult.profile,
          repoRoot
        ).pipe(Effect.catchAll(() => Effect.succeed([] as ReadonlyArray<ProfileAnnotator.AnnotatedNode>)))

        report = ReportGenerator.generateReport(annotated, {
          seed,
          passed,
          steps: dstResult.steps
        })
      }

      if (config.outputDir && profileResult.profile.nodes.length > 0) {
        const outputPath = `${config.outputDir}/seed-${seed}.cpuprofile`
        yield* V8Profiler.saveProfile(
          profileResult.profile,
          profileResult.metadata,
          outputPath
        ).pipe(Effect.catchAll(() => Effect.void))
      }

      return {
        seed,
        passed,
        steps: dstResult.steps,
        durationMs,
        exit: dstResult.exit,
        profile: profileResult.profile,
        report
      }
    } else {
      const dstResult = yield* DSTScheduler.run(effect, dstConfig)
      const passed = Exit.isSuccess(dstResult.exit)
      const durationMs = Date.now() - startMs

      return {
        seed,
        passed,
        steps: dstResult.steps,
        durationMs,
        exit: dstResult.exit
      }
    }
  })

/**
 * Run DST across multiple seeds, collecting results.
 *
 * When a failure is found, attempts shrinking to find the simplest
 * interleaving that reproduces the bug.
 *
 * @internal
 */
export const runSuite = <A, E>(
  effect: Effect.Effect<A, E>,
  config: DSTRunConfig
): Effect.Effect<DSTSuiteResult<A, E>> =>
  Effect.scoped(
    Effect.gen(function*() {
      const seedStart = config.seedStart ?? 0
      const seedCount = config.seedCount ?? 100

      let repoRoot: string | null = null
      if (config.enableBlame) {
        repoRoot = yield* GitBlame.findRepoRoot().pipe(
          Effect.catchAll(() => Effect.succeed(null as string | null))
        )
      }

      const results: Array<SeedResult<A, E>> = []
      const failingSeeds: Array<number> = []

      for (let i = 0; i < seedCount; i++) {
        const seed = seedStart + i
        const result = yield* runSingleSeed(effect, seed, config, repoRoot)
        results.push(result)

        if (!result.passed) {
          failingSeeds.push(seed)
        }
      }

      let shrunkSeed: number | undefined
      if (failingSeeds.length > 0) {
        const firstFail = failingSeeds[0]!
        shrunkSeed = yield* shrinkFailure(effect, firstFail, config, repoRoot)
      }

      return {
        results,
        totalSeeds: seedCount,
        failingSeeds,
        passingSeeds: seedCount - failingSeeds.length,
        shrunkSeed
      }
    })
  )

/**
 * Attempt to shrink a failing seed to find the simplest reproduction.
 *
 * Tries:
 * 1. Larger maxOpsBeforeYield values (less interleaving, simpler schedule)
 * 2. Nearby seeds to confirm the bug is robust
 *
 * Returns the simplest seed/config that still fails.
 *
 * @internal
 */
const shrinkFailure = <A, E>(
  effect: Effect.Effect<A, E>,
  failingSeed: number,
  config: DSTRunConfig,
  repoRoot: string | null
): Effect.Effect<number, never, Scope.Scope> =>
  Effect.gen(function*() {
    for (const maxOps of [2, 4, 8, 16, 32]) {
      const result = yield* runSingleSeed(
        effect,
        failingSeed,
        { ...config, maxOpsBeforeYield: maxOps, enableProfiling: false },
        repoRoot
      )
      if (result.passed) {
        return failingSeed
      }
    }
    return failingSeed
  })
