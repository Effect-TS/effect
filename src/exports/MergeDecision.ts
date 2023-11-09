import type { MergeDecisionTypeId } from "../MergeDecision.js"

export * from "../internal/Jumpers/MergeDecision.js"
export * from "../MergeDecision.js"

export declare namespace MergeDecision {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../MergeDecision.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MergeDecision<R, E0, Z0, E, Z> extends MergeDecision.Variance<R, E0, Z0, E, Z> {}

/**
 * @since 2.0.0
 */
export declare namespace MergeDecision {
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
