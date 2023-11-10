/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { IntervalsTypeId } from "./impl/ScheduleIntervals.js"
import type { ScheduleInterval } from "./ScheduleInterval.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/ScheduleIntervals.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/ScheduleIntervals.js"

/**
 * @since 2.0.0
 */
export declare namespace ScheduleIntervals {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ScheduleIntervals.js"
}
/**
 * An `ScheduleIntervals` represents a list of several `ScheduleInterval`s.
 *
 * @since 2.0.0
 * @category models
 */
export interface ScheduleIntervals {
  readonly [IntervalsTypeId]: IntervalsTypeId
  readonly intervals: Chunk<ScheduleInterval>
}
