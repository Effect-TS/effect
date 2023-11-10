import type * as Duration from "../Duration.js"
import * as internal from "../internal/schedule/interval.js"
import type * as Option from "../Option.js"
import type { ScheduleInterval } from "../ScheduleInterval.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const IntervalTypeId: unique symbol = internal.IntervalTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type IntervalTypeId = typeof IntervalTypeId

/**
 * Constructs a new interval from the two specified endpoints. If the start
 * endpoint greater than the end endpoint, then a zero size interval will be
 * returned.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: (startMillis: number, endMillis: number) => ScheduleInterval = internal.make

/**
 * An `ScheduleInterval` of zero-width.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: ScheduleInterval = internal.empty

/**
 * Returns `true` if this `ScheduleInterval` is less than `that` interval, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category ordering
 */
export const lessThan: {
  (that: ScheduleInterval): (self: ScheduleInterval) => boolean
  (self: ScheduleInterval, that: ScheduleInterval): boolean
} = internal.lessThan

/**
 * Returns the minimum of two `ScheduleInterval`s.
 *
 * @since 2.0.0
 * @category ordering
 */
export const min: {
  (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval
  (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval
} = internal.min

/**
 * Returns the maximum of two `ScheduleInterval`s.
 *
 * @since 2.0.0
 * @category ordering
 */
export const max: {
  (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval
  (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval
} = internal.max

/**
 * Returns `true` if the specified `ScheduleInterval` is empty, `false` otherwise.
 *
 * @since 2.0.0
 * @category ordering
 */
export const isEmpty: (self: ScheduleInterval) => boolean = internal.isEmpty

/**
 * Returns `true` if the specified `ScheduleInterval` is non-empty, `false` otherwise.
 *
 * @since 2.0.0
 * @category ordering
 */
export const isNonEmpty: (self: ScheduleInterval) => boolean = internal.isNonEmpty

/**
 * Computes a new `ScheduleInterval` which is the intersection of this `ScheduleInterval` and
 * that `ScheduleInterval`.
 *
 * @since 2.0.0
 * @category ordering
 */
export const intersect: {
  (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval
  (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval
} = internal.intersect

/**
 * Calculates the size of the `ScheduleInterval` as the `Duration` from the start of the
 * interval to the end of the interval.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: (self: ScheduleInterval) => Duration.Duration = internal.size

/**
 * Computes a new `ScheduleInterval` which is the union of this `ScheduleInterval` and that
 * `ScheduleInterval` as a `Some`, otherwise returns `None` if the two intervals cannot
 * form a union.
 *
 * @since 2.0.0
 * @category utils
 */
export const union: {
  (that: ScheduleInterval): (self: ScheduleInterval) => Option.Option<ScheduleInterval>
  (self: ScheduleInterval, that: ScheduleInterval): Option.Option<ScheduleInterval>
} = internal.union

/**
 * Construct an `ScheduleInterval` that includes all time equal to and after the
 * specified start time.
 *
 * @since 2.0.0
 * @category constructors
 */
export const after: (startMilliseconds: number) => ScheduleInterval = internal.after

/**
 * Construct an `ScheduleInterval` that includes all time equal to and before the
 * specified end time.
 *
 * @category constructors
 * @since 2.0.0
 */
export const before: (endMilliseconds: number) => ScheduleInterval = internal.before
