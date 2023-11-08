/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import * as internal from "./internal/schedule/intervals.js"
import type { Interval } from "./ScheduleInterval.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const IntervalsTypeId: unique symbol = internal.IntervalsTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type IntervalsTypeId = typeof IntervalsTypeId

export * as ScheduleIntervals from "./ScheduleIntervals.js"

declare module "./ScheduleIntervals.js" {
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
}

/**
 * Creates a new `ScheduleIntervals` from a `List` of `Interval`s.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: (intervals: Chunk<Interval>) => ScheduleIntervals = internal.make

/**
 * Constructs an empty list of `Interval`s.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: ScheduleIntervals = internal.empty

/**
 * Constructs `ScheduleIntervals` from the specified `Iterable<Interval>`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: (intervals: Iterable<Interval>) => ScheduleIntervals = internal.fromIterable

/**
 * Computes the union of this `ScheduleIntervals` and  that `ScheduleIntervals`
 *
 * @since 2.0.0
 * @category utils
 */
export const union: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
} = internal.union

/**
 * Produces the intersection of this `ScheduleIntervals` and that `ScheduleIntervals`.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersect: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
} = internal.intersect

/**
 * The start of the earliest interval in the specified `ScheduleIntervals`.
 *
 * @since 2.0.0
 * @category getters
 */
export const start: (self: ScheduleIntervals) => number = internal.start

/**
 * The end of the latest interval in the specified `ScheduleIntervals`.
 *
 * @since 2.0.0
 * @category getters
 */
export const end: (self: ScheduleIntervals) => number = internal.end

/**
 * Returns `true` if the start of this `ScheduleIntervals` is before the start of that
 * `ScheduleIntervals`, `false` otherwise.
 *
 * @since 2.0.0
 * @category ordering
 */
export const lessThan: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => boolean
  (self: ScheduleIntervals, that: ScheduleIntervals): boolean
} = internal.lessThan

/**
 * Returns `true` if this `ScheduleIntervals` is non-empty, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isNonEmpty: (self: ScheduleIntervals) => boolean = internal.isNonEmpty

/**
 * Returns the maximum of the two `ScheduleIntervals` (i.e. which has the latest start).
 *
 * @since 2.0.0
 * @category ordering
 */
export const max: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
} = internal.max
