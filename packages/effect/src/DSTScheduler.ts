/**
 * Deterministic Simulation Testing (DST) for Effect.
 *
 * Provides a seeded PRNG-based scheduler that controls all fiber interleaving
 * deterministically. Given the same seed, execution order is always identical,
 * enabling reproducible concurrency bug detection.
 *
 * ```ts
 * import { DSTScheduler, Effect } from "effect"
 *
 * // Run an effect under deterministic simulation
 * const result = DSTScheduler.run(
 *   Effect.race(Effect.succeed("a"), Effect.succeed("b")),
 *   { seed: 42 }
 * )
 *
 * // Iterate multiple seeds to explore interleavings
 * for (let seed = 0; seed < 100; seed++) {
 *   const result = DSTScheduler.run(myEffect, { seed })
 *   // Same seed always produces same result
 * }
 * ```
 *
 * @since 3.22.0
 */

import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import * as DSTSchedulerImpl from "./internal/dst/dstScheduler.js"
import * as DSTRuntimeImpl from "./internal/dst/dstRuntime.js"
import type * as EventLog from "./internal/dst/eventLog.js"

// ── Re-export types ──────────────────────────────────────────────────────

/**
 * Configuration for a DST run.
 *
 * @since 3.22.0
 * @category models
 */
export interface DSTConfig {
  /** The seed for the PRNG. Same seed = same execution order. */
  readonly seed: number
  /** Max operations before a fiber is forced to yield. Lower = more interleaving. Default: 2048 */
  readonly maxOpsBeforeYield?: number
  /** Max scheduler steps before stopping. Prevents infinite loops. Default: 100_000 */
  readonly maxSteps?: number
}

/**
 * Result of a DST run, including the exit value and diagnostic data.
 *
 * @since 3.22.0
 * @category models
 */
export interface DSTResult<A, E> {
  /** The exit value of the effect (success or failure). */
  readonly exit: Exit.Exit<A, E>
  /** The seed used for this run. */
  readonly seed: number
  /** Total scheduler steps executed. */
  readonly steps: number
  /** Full event log for replay/debugging. */
  readonly eventLog: DSTEventLog
  /** Final scheduler snapshot (PRNG state). */
  readonly finalSnapshot: DSTSnapshot
}

/**
 * A single event in the DST event log.
 *
 * @since 3.22.0
 * @category models
 */
export type DSTEvent = EventLog.DSTEvent

/**
 * The DST event log, recording every scheduling decision.
 *
 * @since 3.22.0
 * @category models
 */
export type DSTEventLog = EventLog.DSTEventLog

/**
 * A snapshot of the DST scheduler state for save/restore.
 *
 * @since 3.22.0
 * @category models
 */
export type DSTSnapshot = DSTSchedulerImpl.DSTSnapshot

/**
 * The DST Scheduler instance. Implements the Effect Scheduler interface
 * with deterministic PRNG-based task selection.
 *
 * @since 3.22.0
 * @category models
 */
export type DSTScheduler = DSTSchedulerImpl.DSTScheduler

// ── Constructors ─────────────────────────────────────────────────────────

/**
 * Create a new DSTScheduler with the given configuration.
 *
 * @since 3.22.0
 * @category constructors
 */
export const make: (config: DSTConfig) => DSTScheduler = DSTSchedulerImpl.make

/**
 * Run an Effect under full deterministic simulation.
 *
 * This function:
 * 1. Creates a DSTScheduler with the given seed
 * 2. Installs it as the current scheduler via `withScheduler`
 * 3. Installs a seeded Random for deterministic randomness
 * 4. Patches FiberId generation for deterministic fiber IDs
 * 5. Steps the scheduler until completion or maxSteps
 * 6. Returns the DSTResult with exit value and event log
 *
 * @since 3.22.0
 * @category execution
 */
export const run: <A, E>(
  effect: Effect.Effect<A, E>,
  config: DSTConfig
) => Effect.Effect<DSTResult<A, E>> = DSTRuntimeImpl.run as any

/**
 * Run an Effect under DST with multiple seeds, collecting all results.
 *
 * @since 3.22.0
 * @category execution
 */
export const runMany: <A, E>(
  effect: Effect.Effect<A, E>,
  config: {
    readonly seedStart?: number
    readonly seedCount?: number
    readonly maxOpsBeforeYield?: number
    readonly maxSteps?: number
  }
) => Effect.Effect<ReadonlyArray<DSTResult<A, E>>> = DSTRuntimeImpl.runMany as any
