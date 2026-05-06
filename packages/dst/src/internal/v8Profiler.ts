/**
 * V8 CPU Profiler - Effect-wrapped node:inspector Session for capturing
 * .cpuprofile data during test execution.
 *
 * @internal
 */

import * as Effect from "effect/Effect"
import * as Scope from "effect/Scope"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface CallFrame {
  readonly functionName: string
  readonly scriptId: string
  readonly url: string
  readonly lineNumber: number
  readonly columnNumber: number
}

/** @internal */
export interface ProfileNode {
  readonly id: number
  readonly callFrame: CallFrame
  readonly hitCount: number
  readonly children?: ReadonlyArray<number>
}

/** @internal */
export interface V8Profile {
  readonly nodes: ReadonlyArray<ProfileNode>
  readonly startTime: number
  readonly endTime: number
  readonly samples?: ReadonlyArray<number>
  readonly timeDeltas?: ReadonlyArray<number>
}

/** @internal */
export interface ProfileMetadata {
  readonly testName: string
  readonly seed: number
  readonly passed: boolean
  readonly steps: number
  readonly capturedAt: string
}

/** @internal */
export interface ProfileResult<A, E> {
  readonly exit: import("effect/Exit").Exit<A, E>
  readonly profile: V8Profile
  readonly metadata: ProfileMetadata
}

// ── Session Management ───────────────────────────────────────────────────

/** @internal */
const post = (session: any, method: string, params?: object): Effect.Effect<any, Error> =>
  Effect.async<any, Error>((resume) => {
    session.post(method, params ?? {}, (err: Error | null, result: any) => {
      if (err) {
        resume(Effect.fail(err))
      } else {
        resume(Effect.succeed(result))
      }
    })
  })

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Capture a V8 CPU profile while executing an effect.
 *
 * Uses node:inspector Session API. The profiler runs at the V8 level,
 * capturing actual CPU samples with call frame information.
 *
 * @internal
 */
export const captureProfile = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  metadata: Omit<ProfileMetadata, "capturedAt" | "passed">
): Effect.Effect<ProfileResult<A, E>, Error, R | Scope.Scope> =>
  Effect.gen(function*() {
    const inspector = yield* Effect.try(() => require("node:inspector") as typeof import("node:inspector"))

    const session = new inspector.Session()
    session.connect()

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        try {
          session.disconnect()
        } catch {
        }
      })
    )

    yield* post(session, "Profiler.enable")
    yield* post(session, "Profiler.start")

    const exit = yield* Effect.exit(effect)

    const { profile } = yield* post(session, "Profiler.stop")
    yield* post(session, "Profiler.disable")

    const passed = exit._tag === "Success"

    return {
      exit,
      profile: profile as V8Profile,
      metadata: {
        ...metadata,
        passed,
        capturedAt: new Date().toISOString()
      }
    }
  })

/**
 * Compute self-time for each node from the samples/timeDeltas arrays.
 *
 * Self-time is the CPU time spent directly in that function (not in callees).
 * Measured in microseconds.
 *
 * @internal
 */
export const computeSelfTimes = (profile: V8Profile): Map<number, number> => {
  const times = new Map<number, number>()
  if (!profile.samples || !profile.timeDeltas) return times

  for (let i = 0; i < profile.samples.length; i++) {
    const nodeId = profile.samples[i]!
    const delta = profile.timeDeltas[i]!
    times.set(nodeId, (times.get(nodeId) ?? 0) + delta)
  }
  return times
}

/**
 * Save a profile to disk as a .cpuprofile JSON file.
 *
 * @internal
 */
export const saveProfile = (
  profile: V8Profile,
  metadata: ProfileMetadata,
  outputPath: string
): Effect.Effect<void, Error> =>
  Effect.try(() => {
    const fs = require("node:fs") as typeof import("node:fs")
    const dir = require("node:path").dirname(outputPath) as string
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      outputPath,
      JSON.stringify({ ...profile, _metadata: metadata }, null, 2),
      "utf-8"
    )
  })
