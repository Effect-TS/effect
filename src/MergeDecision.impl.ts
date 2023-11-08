/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.js"
import * as internal from "./internal/channel/mergeDecision.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MergeDecisionTypeId: unique symbol = internal.MergeDecisionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MergeDecisionTypeId = typeof MergeDecisionTypeId

import type { MergeDecision } from "../../MergeDecision.js"

export declare namespace MergeDecision {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MergeDecision.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface MergeDecision<R, E0, Z0, E, Z> extends MergeDecision.Variance<R, E0, Z0, E, Z> {}

  /**
   * @since 2.0.0
   */
  export namespace MergeDecision {
    /**
     * @since 2.0.0
     * @category models
     */
    export interface Variance<R, E0, Z0, E, Z> {
      readonly [MergeDecisionTypeId]: {
        _R: (_: never) => R
        _E0: (_: E0) => void
        _Z0: (_: Z0) => void
        _E: (_: never) => E
        _Z: (_: never) => Z
      }
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const Done: <R, E, Z>(effect: Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z> = internal.Done

/**
 * @since 2.0.0
 * @category constructors
 */
export const Await: <R, E0, Z0, E, Z>(
  f: (exit: Exit<E0, Z0>) => Effect<R, E, Z>
) => MergeDecision<R, E0, Z0, E, Z> = internal.Await

/**
 * @since 2.0.0
 * @category constructors
 */
export const AwaitConst: <R, E, Z>(effect: Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z> =
  internal.AwaitConst

/**
 * Returns `true` if the specified value is a `MergeDecision`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isMergeDecision: (u: unknown) => u is MergeDecision<unknown, unknown, unknown, unknown, unknown> =
  internal.isMergeDecision

/**
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <R, E0, Z0, E, Z, Z2>(
    options: {
      readonly onDone: (effect: Effect<R, E, Z>) => Z2
      readonly onAwait: (f: (exit: Exit<E0, Z0>) => Effect<R, E, Z>) => Z2
    }
  ): (self: MergeDecision<R, E0, Z0, E, Z>) => Z2
  <R, E0, Z0, E, Z, Z2>(
    self: MergeDecision<R, E0, Z0, E, Z>,
    options: {
      readonly onDone: (effect: Effect<R, E, Z>) => Z2
      readonly onAwait: (f: (exit: Exit<E0, Z0>) => Effect<R, E, Z>) => Z2
    }
  ): Z2
} = internal.match
