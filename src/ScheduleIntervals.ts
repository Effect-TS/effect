import type { Chunk } from "./Chunk.js"
import type { Interval } from "./ScheduleInterval.js"
import type { IntervalsTypeId } from "./ScheduleIntervals.impl.js"

export * from "./internal/Jumpers/ScheduleIntervals.js"
export * from "./ScheduleIntervals.impl.js"

export declare namespace ScheduleIntervals {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./ScheduleIntervals.impl.js"
}
/**
 * An `ScheduleIntervals` represents a list of several `Interval`s.
 *
 * @since 2.0.0
 * @category models
 */
export interface ScheduleIntervals {
  readonly [IntervalsTypeId]: IntervalsTypeId
  readonly intervals: Chunk<Interval>
}
