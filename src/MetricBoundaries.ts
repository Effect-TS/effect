/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { Equal } from "./Equal.js"
import type { MetricBoundariesTypeId } from "./impl/MetricBoundaries.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/MetricBoundaries.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/MetricBoundaries.js"

/**
 * @since 2.0.0
 */
export declare namespace MetricBoundaries {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricBoundaries.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MetricBoundaries extends Equal, Pipeable {
  readonly [MetricBoundariesTypeId]: MetricBoundariesTypeId
  readonly values: Chunk<number>
}
