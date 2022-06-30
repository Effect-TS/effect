export const IntervalSym = Symbol.for("@effect/core/io/Schedule/Interval")
export type IntervalSym = typeof IntervalSym

/**
 * An `Interval` represents an interval of time. Intervals can encompass all
 * time, or no time at all.
 *
 * @tsplus type effect/core/io/Schedule/Interval
 */
export interface Interval {
  readonly [IntervalSym]: IntervalSym
  readonly startMillis: number
  readonly endMillis: number
}

/**
 * @tsplus type effect/core/io/Schedule/Interval.Ops
 */
export interface IntervalOps {
  $: IntervalAspects
}
export const Interval: IntervalOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Schedule/Interval.Aspects
 */
export interface IntervalAspects {}

/**
 * An `Interval` of zero-width.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops empty
 */
export const empty: Interval = Interval(0, 0)

/**
 * Constructs a new interval from the two specified endpoints. If the start
 * endpoint greater than the end endpoint, then a zero size interval will be
 * returned.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops __call
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
 */
export function lessThan(that: Interval) {
  return (self: Interval): boolean => self.min(that) === self
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects min
 * @tsplus pipeable effect/core/io/Schedule/Interval min
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
 */
export function max(that: Interval) {
  return (self: Interval): Interval => self.min(that) === self ? that : self
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval isEmpty
 */
export function isEmpty(self: Interval): boolean {
  return self.startMillis >= self.endMillis
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval isNonEmpty
 */
export function isNonEmpty(self: Interval): boolean {
  return !self.isEmpty
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects intersect
 * @tsplus pipeable effect/core/io/Schedule/Interval intersect
 */
export function intersect(that: Interval) {
  return (self: Interval): Interval => {
    const start = Ord.number.min(self.startMillis, that.startMillis)
    const end = Ord.number.max(self.endMillis, that.endMillis)
    return Interval(start, end)
  }
}

/**
 * @tsplus getter effect/core/io/Schedule/Interval size
 */
export function size(self: Interval): Duration {
  return new Duration(self.endMillis - self.startMillis)
}

/**
 * @tsplus static effect/core/io/Schedule/Interval.Aspects union
 * @tsplus pipeable effect/core/io/Schedule/Interval union
 */
export function union(that: Interval) {
  return (self: Interval): Maybe<Interval> => {
    const start = Ord.number.max(self.startMillis, that.startMillis)
    const end = Ord.number.min(self.endMillis, that.endMillis)
    return start < end ? Maybe.none : Maybe.some(Interval(start, end))
  }
}

/**
 * Construct an `Interval` that includes all time equal to and after the
 * specified start time.
 *
 * @tsplus static effect/core/io/Schedule/Interval.Ops after
 */
export function after(startMilliseconds: number): Interval {
  return Interval(startMilliseconds, Number.MAX_SAFE_INTEGER)
}

/**
 * Construct an `Interval` that includes all time equal to and before the
 * specified end time.
 *
 * @tsplus static effect/core/io/Schedule/Interval before
 */
export function before(endMilliseconds: number): Interval {
  return Interval(Number.MIN_SAFE_INTEGER, endMilliseconds)
}
