import { Duration } from "../../data/Duration"
import { Option } from "../../data/Option"
import * as Ord from "../../prelude/Ord"

export const IntervalSym = Symbol.for("@effect-ts/core/io/Schedule/Interval")
export type IntervalSym = typeof IntervalSym

/**
 * An `Interval` represents an interval of time. Intervals can encompass all
 * time, or no time at all.
 *
 * @tsplus type ets/Interval
 */
export interface Interval {
  readonly [IntervalSym]: IntervalSym
  readonly startMilliseconds: number
  readonly endMilliseconds: number
}

/**
 * @tsplus type ets/IntervalOps
 */
export interface IntervalOps {}
export const Interval: IntervalOps = {}

/**
 * An `Interval` of zero-width.
 *
 * @tsplus static ets/IntervalOps empty
 */
export const empty: Interval = Interval(0, 0)

/**
 * Constructs a new interval from the two specified endpoints. If the start
 * endpoint greater than the end endpoint, then a zero size interval will be
 * returned.
 *
 * @tsplus static ets/IntervalOps __call
 */
export function make(startMilliseconds: number, endMilliseconds: number): Interval {
  return startMilliseconds > endMilliseconds
    ? Interval.empty
    : {
        [IntervalSym]: IntervalSym,
        startMilliseconds,
        endMilliseconds
      }
}

/**
 * @tsplus operator ets/Interval <
 * @tsplus fluent ets/Interval lessThan
 */
export function lessThan_(self: Interval, that: Interval): boolean {
  return self.min(that) === self
}

/**
 * @ets_data_first lessThan_
 */
export function lessThan(that: Interval) {
  return (self: Interval): boolean => self.lessThan(that)
}

/**
 * @tsplus fluent ets/Interval min
 */
export function min_(self: Interval, that: Interval): Interval {
  if (self.endMilliseconds <= that.startMilliseconds) return self
  if (that.endMilliseconds <= self.startMilliseconds) return that
  if (self.startMilliseconds < that.startMilliseconds) return self
  if (that.startMilliseconds < self.startMilliseconds) return that
  if (self.endMilliseconds <= that.endMilliseconds) return self
  return that
}

/**
 * @ets_data_first min_
 */
export function min(that: Interval) {
  return (self: Interval): Interval => self.min(that)
}

/**
 * @tsplus fluent ets/Interval max
 */
export function max_(self: Interval, that: Interval): Interval {
  return self.min(that) === self ? that : self
}

/**
 * @ets_data_first max_
 */
export function max(that: Interval) {
  return (self: Interval): Interval => self.max(that)
}

/**
 * @tsplus fluent ets/Interval isEmpty
 */
export function isEmpty(self: Interval): boolean {
  return self.startMilliseconds >= self.endMilliseconds
}

/**
 * @tsplus fluent ets/Interval isNonEmpty
 */
export function isNonEmpty(self: Interval): boolean {
  return !self.isEmpty()
}

/**
 * @tsplus fluent ets/Interval intersect
 */
export function intersect_(self: Interval, that: Interval): Interval {
  const start = minMilliseconds(self.startMilliseconds, that.startMilliseconds)
  const end = maxMilliseconds(self.endMilliseconds, that.endMilliseconds)
  return Interval(start, end)
}

/**
 * @ets_data_first intersect_
 */
export function intersect(that: Interval) {
  return (self: Interval): Interval => self.intersect(that)
}

/**
 * @tsplus getter ets/Interval size
 */
export function size(self: Interval): Duration {
  return Duration(self.endMilliseconds - self.startMilliseconds)
}

/**
 * @tsplus fluent ets/Interval union
 */
export function union_(self: Interval, that: Interval): Option<Interval> {
  const start = maxMilliseconds(self.startMilliseconds, that.startMilliseconds)
  const end = minMilliseconds(self.endMilliseconds, that.endMilliseconds)
  return start < end ? Option.none : Option.some(Interval(start, end))
}

/**
 * @ets_data_first union_
 */
export function union(that: Interval) {
  return (self: Interval): Option<Interval> => self.union(that)
}

/**
 * Construct an `Interval` that includes all time equal to and after the
 * specified start time.
 *
 * @tsplus static ets/IntervalOps after
 */
export function after(startMilliseconds: number): Interval {
  return Interval(startMilliseconds, Number.MAX_SAFE_INTEGER)
}

/**
 * Construct an `Interval` that includes all time equal to and before the
 * specified end time.
 *
 * @tsplus static ets/Interval before
 */
export function before(endMilliseconds: number): Interval {
  return Interval(Number.MIN_SAFE_INTEGER, endMilliseconds)
}

const minMilliseconds = Ord.min(Ord.number)

const maxMilliseconds = Ord.max(Ord.number)
