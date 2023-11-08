/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { Equal } from "./Equal.js"
import * as internal from "./internal/metric/boundaries.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricBoundariesTypeId: unique symbol = internal.MetricBoundariesTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricBoundariesTypeId = typeof MetricBoundariesTypeId

export declare namespace MetricBoundaries {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MetricBoundaries.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface MetricBoundaries extends Equal, Pipeable {
    readonly [MetricBoundariesTypeId]: MetricBoundariesTypeId
    readonly values: Chunk<number>
  }
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricBoundaries: (u: unknown) => u is MetricBoundaries = internal.isMetricBoundaries

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromChunk: (chunk: Chunk<number>) => MetricBoundaries = internal.fromChunk

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const linear: (
  options: {
    readonly start: number
    readonly width: number
    readonly count: number
  }
) => MetricBoundaries = internal.linear

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const exponential: (
  options: {
    readonly start: number
    readonly factor: number
    readonly count: number
  }
) => MetricBoundaries = internal.exponential
