import type { IntervalsTypeId } from "../ScheduleIntervals.js"
import type { Chunk } from "./Chunk.js"
import type { Interval } from "./ScheduleInterval.js"

export * from "../internal/Jumpers/ScheduleIntervals.js"
export * from "../ScheduleIntervals.js"

export declare namespace ScheduleIntervals {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../ScheduleIntervals.js"
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
