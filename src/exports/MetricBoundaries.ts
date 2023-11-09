import type { MetricBoundariesTypeId } from "../MetricBoundaries.js"
import type { Chunk } from "./Chunk.js"
import type { Equal } from "./Equal.js"
import type { Pipeable } from "./Pipeable.js"

export * from "../internal/Jumpers/MetricBoundaries.js"
export * from "../MetricBoundaries.js"

export declare namespace MetricBoundaries {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../MetricBoundaries.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MetricBoundaries extends Equal, Pipeable {
  readonly [MetricBoundariesTypeId]: MetricBoundariesTypeId
  readonly values: Chunk<number>
}
