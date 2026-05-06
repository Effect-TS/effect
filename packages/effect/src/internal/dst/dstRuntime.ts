/**
 * DSTRuntime - Assembles a fully deterministic execution environment.
 *
 * Uses Runtime.unsafeFork with scheduler option to run fibers on the
 * DSTScheduler, then steps the scheduler synchronously.
 *
 * @internal
 */

import type * as Effect from "../../Effect.js"
import type * as Exit from "../../Exit.js"
import { globalValue } from "../../GlobalValue.js"
import * as MutableRef from "../../MutableRef.js"
import * as core from "../core.js"
import * as defaultServices from "../defaultServices.js"
import * as _fiberId from "../fiberId.js"
import * as _runtime from "../runtime.js"
import * as _random from "../random.js"
import * as DSTSchedulerImpl from "./dstScheduler.js"
import type * as EventLog from "./eventLog.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface DSTConfig {
  readonly seed: number
  readonly maxOpsBeforeYield?: number
  readonly maxSteps?: number
}

/** @internal */
export interface DSTResult<A, E> {
  readonly exit: Exit.Exit<A, E>
  readonly seed: number
  readonly steps: number
  readonly eventLog: EventLog.DSTEventLog
  readonly finalSnapshot: DSTSchedulerImpl.DSTSnapshot
}

// ── Deterministic FiberId Patching ───────────────────────────────────────

const getFiberCounter = (): MutableRef.MutableRef<number> =>
  globalValue(
    Symbol.for("effect/Fiber/Id/_fiberCounter"),
    () => MutableRef.make(0)
  )

/** @internal */
export interface FiberIdPatch {
  readonly savedCount: number
}

/** @internal */
export const patchFiberId = (deterministicTimeMs: number): FiberIdPatch => {
  const counter = getFiberCounter()
  const savedCount = MutableRef.get(counter)
  MutableRef.set(counter, 0)

  _fiberId.setClockSource(() => deterministicTimeMs)

  return { savedCount }
}

/** @internal */
export const unpatchFiberId = (patch: FiberIdPatch): void => {
  const counter = getFiberCounter()
  MutableRef.set(counter, patch.savedCount)

  _fiberId.resetClockSource()
}

// ── DST Execution ────────────────────────────────────────────────────────

/**
 * Run an Effect under full deterministic simulation.
 *
 * @internal
 */
export const run = <A, E>(
  effect: Effect.Effect<A, E>,
  config: DSTConfig
): Effect.Effect<DSTResult<A, E>> =>
  core.sync(() => {
    const scheduler = DSTSchedulerImpl.make(config)
    const seededRandom = _random.make(config.seed)

    const fiberIdPatch = patchFiberId(0)

    try {
      const wrappedEffect = defaultServices.withRandom(seededRandom)(effect)

      const fiber = _runtime.unsafeForkEffect(wrappedEffect, {
        scheduler,
        immediate: false
      })

      const steps = scheduler.stepUntilDone()

      const exit = fiber.unsafePoll()

      return {
        exit: exit ?? core.exitVoid as unknown as Exit.Exit<A, E>,
        seed: config.seed,
        steps,
        eventLog: scheduler.getEventLog(),
        finalSnapshot: scheduler.snapshot()
      } as DSTResult<A, E>
    } finally {
      unpatchFiberId(fiberIdPatch)
    }
  })

/**
 * Run an Effect under DST with multiple seeds sequentially.
 *
 * @internal
 */
export const runMany = <A, E>(
  effect: Effect.Effect<A, E>,
  config: {
    readonly seedStart?: number
    readonly seedCount?: number
    readonly maxOpsBeforeYield?: number
    readonly maxSteps?: number
  }
): Effect.Effect<ReadonlyArray<DSTResult<A, E>>> => {
  const seedStart = config.seedStart ?? 0
  const seedCount = config.seedCount ?? 100

  return core.forEachSequential(
    Array.from({ length: seedCount }, (_, i) => seedStart + i),
    (seed) =>
      run(effect, {
        seed,
        ...(config.maxOpsBeforeYield !== undefined ? { maxOpsBeforeYield: config.maxOpsBeforeYield } : {}),
        ...(config.maxSteps !== undefined ? { maxSteps: config.maxSteps } : {})
      })
  ) as Effect.Effect<ReadonlyArray<DSTResult<A, E>>>
}
