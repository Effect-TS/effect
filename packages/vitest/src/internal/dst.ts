/**
 * DST Vitest Integration - Adds `it.dst()` for deterministic simulation testing.
 *
 * Runs an Effect-based test across multiple seeds, each with a deterministic
 * scheduler that controls fiber interleaving via seeded PRNG. If any seed
 * produces a failure, the test fails with diagnostic information including
 * the seed and event log for replay.
 *
 * @internal
 */

import * as Cause from "effect/Cause"
import type * as DSTSchedulerMod from "effect/DSTScheduler"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import type * as V from "vitest"
import type * as Vitest from "../index.js"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface DSTTestOptions {
  /** Number of seeds to test. Default: 50 */
  readonly seeds?: number
  /** Starting seed. Default: 0 */
  readonly seedStart?: number
  /** Max scheduler steps per seed. Default: 100_000 */
  readonly maxSteps?: number
  /** Max ops before yield (lower = more interleaving). Default: 1 */
  readonly maxOpsBeforeYield?: number
  /** Vitest timeout in ms. Default: 60_000 */
  readonly timeout?: number
}

/** @internal */
export interface DSTTester {
  <A, E>(
    name: string,
    self: (ctx: V.TestContext) => Effect.Effect<A, E>,
    options?: DSTTestOptions
  ): void
  skip: DSTTester
  only: DSTTester
}

/** @internal */
class DSTFailure extends Error {
  readonly _tag = "DSTFailure"
  constructor(
    readonly seed: number,
    readonly steps: number,
    readonly cause: Cause.Cause<unknown>
  ) {
    super(
      `DST failure at seed ${seed} after ${steps} steps:\n${Cause.pretty(cause)}`
    )
    this.name = "DSTFailure"
  }
}

// ── Implementation ───────────────────────────────────────────────────────

/** @internal */
export const makeDSTTester = (
  it: Vitest.API
): DSTTester => {
  const f = <A, E>(
    name: string,
    self: (ctx: V.TestContext) => Effect.Effect<A, E>,
    options?: DSTTestOptions
  ): void => {
    const seeds = options?.seeds ?? 50
    const seedStart = options?.seedStart ?? 0
    const maxSteps = options?.maxSteps ?? 100_000
    const maxOpsBeforeYield = options?.maxOpsBeforeYield ?? 1
    const timeout = options?.timeout ?? 60_000

    it(name, { timeout }, async (ctx) => {
      const DSTScheduler: typeof DSTSchedulerMod = require("effect/DSTScheduler")

      for (let i = 0; i < seeds; i++) {
        const seed = seedStart + i
        const config: DSTSchedulerMod.DSTConfig = {
          seed,
          maxOpsBeforeYield,
          maxSteps
        }

        const result = await pipe(
          Effect.suspend(() => self(ctx)),
          (effect) => DSTScheduler.run(effect, config),
          Effect.runPromise
        )

        if (Exit.isFailure(result.exit)) {
          throw new DSTFailure(seed, result.steps, result.exit.cause)
        }
      }
    })
  }

  const skip = <A, E>(
    name: string,
    self: (ctx: V.TestContext) => Effect.Effect<A, E>,
    options?: DSTTestOptions
  ): void => {
    it.skip(name, { timeout: options?.timeout ?? 60_000 }, () => {})
  }

  const only = <A, E>(
    name: string,
    self: (ctx: V.TestContext) => Effect.Effect<A, E>,
    options?: DSTTestOptions
  ): void => {
    const seeds = options?.seeds ?? 50
    const seedStart = options?.seedStart ?? 0
    const maxSteps = options?.maxSteps ?? 100_000
    const maxOpsBeforeYield = options?.maxOpsBeforeYield ?? 1
    const timeout = options?.timeout ?? 60_000

    it.only(name, { timeout }, async (ctx) => {
      const DSTScheduler: typeof DSTSchedulerMod = require("effect/DSTScheduler")

      for (let i = 0; i < seeds; i++) {
        const seed = seedStart + i
        const config: DSTSchedulerMod.DSTConfig = {
          seed,
          maxOpsBeforeYield,
          maxSteps
        }

        const result = await pipe(
          Effect.suspend(() => self(ctx)),
          (effect) => DSTScheduler.run(effect, config),
          Effect.runPromise
        )

        if (Exit.isFailure(result.exit)) {
          throw new DSTFailure(seed, result.steps, result.exit.cause)
        }
      }
    })
  }

  return Object.assign(f, { skip, only }) as DSTTester
}
