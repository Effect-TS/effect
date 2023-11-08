import type { BackPressure, BufferSliding, MergeStrategyTypeId } from "./impl/MergeStrategy.js"

export * from "./impl/MergeStrategy.js"
export * from "./internal/Jumpers/MergeStrategy.js"

export declare namespace MergeStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MergeStrategy.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type MergeStrategy = BackPressure | BufferSliding

/**
 * @since 2.0.0
 */
export declare namespace MergeStrategy {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [MergeStrategyTypeId]: MergeStrategyTypeId
  }
}
