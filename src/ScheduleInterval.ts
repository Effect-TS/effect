import type { IntervalTypeId } from "./impl/ScheduleInterval.js"

export * from "./impl/ScheduleInterval.js"
export * from "./internal/Jumpers/ScheduleInterval.js"

/**
 * An `ScheduleInterval` represents an interval of time. ScheduleIntervals can encompass all
 * time, or no time at all.
 *
 * @since 2.0.0
 * @category models
 */
export interface ScheduleInterval {
  readonly [IntervalTypeId]: IntervalTypeId
  readonly startMillis: number
  readonly endMillis: number
}

export declare namespace ScheduleInterval {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ScheduleInterval.js"
}
