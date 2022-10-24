import * as Order from "@fp-ts/core/typeclass/Order"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import * as number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const IntervalSym = Symbol.for("@effect/core/io/Schedule/Interval")

/**
 * @category symbol
 * @since 1.0.0
 */
export type IntervalSym = typeof IntervalSym

/**
 * An `Interval` represents an interval of time. Intervals can encompass all
 * time, or no time at all.
 *
 * @tsplus type effect/core/io/Schedule/Interval
 * @category model
 * @since 1.0.0
 */
export interface Interval {
  readonly [IntervalSym]: IntervalSym
  readonly startMillis: number
  readonly endMillis: number
}

/**
 * @tsplus type effect/core/io/Schedule/Interval.Ops
 * @category model
 * @since 1.0.0
 */
export interface IntervalOps {
  $: IntervalAspects
}
export const Interval: IntervalOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Schedule/Interval.Aspects
 * @category model
 * @since 1.0.0
 */
export interface IntervalAspects {}

/**
 * An `Interval` of zero-width.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export const empty: Interval = Interval(0, 0)

/**
 * Constructs a new interval from the two specified endpoints. If the start
 * endpoint greater than the end endpoint, then a zero size interval will be
 * returned.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function fromStartEndMillis(
  startMilliseconds: number,
  endMilliseconds: number
): Interval {
  return startMilliseconds > endMilliseconds
    ? Interval.empty
    : {
      [IntervalSym]: IntervalSym,
      startMillis: startMilliseconds,
      endMillis: endMilliseconds
    }
}

/**
 * @tsplus pipeable-operator effect/core/io/Schedule/Interval <
 * @tsplus static effect/core/io/Schedule/Interval.Aspects lessThan
 * @tsplus pipeable effect/core/io/Schedule/Interval lessThan
 * @category ordering
 * @since 1.0.0
 */
export function lessThan(that: Interval) {
  return (self: Interval): boolean => self.min(that) === self
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects min
 * @tsplus pipeable effect/core/io/Schedule/Interval min
 * @category ordering
 * @since 1.0.0
 */
export function min(that: Interval) {
  return (self: Interval): Interval => {
    if (self.endMillis <= that.startMillis) return self
    if (that.endMillis <= self.startMillis) return that
    if (self.startMillis < that.startMillis) return self
    if (that.startMillis < self.startMillis) return that
    if (self.endMillis <= that.endMillis) return self
    return that
  }
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects max
 * @tsplus pipeable effect/core/io/Schedule/Interval max
 * @category ordering
 * @since 1.0.0
 */
export function max(that: Interval) {
  return (self: Interval): Interval => self.min(that) === self ? that : self
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval isEmpty
 * @category ordering
 * @since 1.0.0
 */
export function isEmpty(self: Interval): boolean {
  return self.startMillis >= self.endMillis
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval isNonEmpty
 * @category ordering
 * @since 1.0.0
 */
export function isNonEmpty(self: Interval): boolean {
  return !self.isEmpty
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects intersect
 * @tsplus pipeable effect/core/io/Schedule/Interval intersect
 * @category ordering
 * @since 1.0.0
 */
export function intersect(that: Interval) {
  return (self: Interval): Interval => {
    const start = Math.max(self.startMillis, that.startMillis)
    const end = Math.min(self.endMillis, that.endMillis)
    return Interval(start, end)
  }
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval size
 * @category getters
 * @since 1.0.0
 */
export function size(self: Interval): Duration.Duration {
  return Duration.millis(self.endMillis - self.startMillis)
}

const numericMaximum = Order.max(number.Order)
const numericMinimum = Order.min(number.Order)

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects union
 * @tsplus pipeable effect/core/io/Schedule/Interval union
 * @category mutations
 * @since 1.0.0
 */
export function union(that: Interval) {
  return (self: Interval): Option.Option<Interval> => {
    const start = pipe(self.startMillis, numericMaximum(that.startMillis))
    const end = pipe(self.endMillis, numericMinimum(that.endMillis))
    return start < end ? Option.none : Option.some(Interval(start, end))
  }
}

/**
 * Construct an `Interval` that includes all time equal to and after the
 * specified start time.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops after
 * @category constructors
 * @since 1.0.0
 */
export function after(startMilliseconds: number): Interval {
  return Interval(startMilliseconds, Number.POSITIVE_INFINITY)
}

/**
 * Construct an `Interval` that includes all time equal to and before the
 * specified end time.
 *
 * @tsplus static effect/core/io/Schedule/Interval before
 * @category constructors
 * @since 1.0.0
 */
export function before(endMilliseconds: number): Interval {
  return Interval(Number.NEGATIVE_INFINITY, endMilliseconds)
}
