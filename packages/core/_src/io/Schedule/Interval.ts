export const IntervalSym = Symbol.for("@effect/core/io/Schedule/Interval")
export type IntervalSym = typeof IntervalSym

/**
 * An `Interval` represents an interval of time. Intervals can encompass all
 * time, or no time at all.
 *
 * @tsplus type ets/Schedule/Interval
 */
export interface Interval {
  readonly [IntervalSym]: IntervalSym
  readonly startMillis: number
  readonly endMillis: number
}

/**
 * @tsplus type ets/Schedule/Interval/Ops
 */
export interface IntervalOps {
  $: IntervalAspects
}
export const Interval: IntervalOps = {
  $: {}
}

/**
 * @tsplus type ets/Schedule/Interval/Aspects
 */
export interface IntervalAspects {}

/**
 * An `Interval` of zero-width.
 *
 * @tsplus static ets/Schedule/Interval/Ops empty
 */
export const empty: Interval = Interval(0, 0)

/**
 * Constructs a new interval from the two specified endpoints. If the start
 * endpoint greater than the end endpoint, then a zero size interval will be
 * returned.
 *
 * @tsplus static ets/Schedule/Interval/Ops __call
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
 * @tsplus operator ets/Schedule/Interval <
 * @tsplus fluent ets/Schedule/Interval lessThan
 */
export function lessThan_(self: Interval, that: Interval): boolean {
  return self.min(that) === self
}

/**
 * @tsplus static ets/Schedule/Interval/Aspects lessThan
 */
export const lessThan = Pipeable(lessThan_)

/**
 * @tsplus fluent ets/Schedule/Interval min
 */
export function min_(self: Interval, that: Interval): Interval {
  if (self.endMillis <= that.startMillis) return self
  if (that.endMillis <= self.startMillis) return that
  if (self.startMillis < that.startMillis) return self
  if (that.startMillis < self.startMillis) return that
  if (self.endMillis <= that.endMillis) return self
  return that
}

/**
 * @tsplus static ets/Schedule/Interval/Aspects min
 */
export const min = Pipeable(min_)

/**
 * @tsplus fluent ets/Schedule/Interval max
 */
export function max_(self: Interval, that: Interval): Interval {
  return self.min(that) === self ? that : self
}

/**
 * @tsplus static ets/Schedule/Interval/Aspects max
 */
export const max = Pipeable(max_)

/**
 * @tsplus getter ets/Schedule/Interval isEmpty
 */
export function isEmpty(self: Interval): boolean {
  return self.startMillis >= self.endMillis
}

/**
 * @tsplus getter ets/Schedule/Interval isNonEmpty
 */
export function isNonEmpty(self: Interval): boolean {
  return !self.isEmpty
}

/**
 * @tsplus fluent ets/Schedule/Interval intersect
 */
export function intersect_(self: Interval, that: Interval): Interval {
  const start = Ord.number.min(self.startMillis, that.startMillis)
  const end = Ord.number.max(self.endMillis, that.endMillis)
  return Interval(start, end)
}

/**
 * @tsplus static ets/Schedule/Interval/Aspects intersect
 */
export const intersect = Pipeable(intersect_)

/**
 * @tsplus getter ets/Schedule/Interval size
 */
export function size(self: Interval): Duration {
  return new Duration(self.endMillis - self.startMillis)
}

/**
 * @tsplus fluent ets/Schedule/Interval union
 */
export function union_(self: Interval, that: Interval): Option<Interval> {
  const start = Ord.number.max(self.startMillis, that.startMillis)
  const end = Ord.number.min(self.endMillis, that.endMillis)
  return start < end ? Option.none : Option.some(Interval(start, end))
}

/**
 * @tsplus static ets/Schedule/Interval/Aspects union
 */
export const union = Pipeable(union_)

/**
 * Construct an `Interval` that includes all time equal to and after the
 * specified start time.
 *
 * @tsplus static ets/Schedule/Interval/Ops after
 */
export function after(startMilliseconds: number): Interval {
  return Interval(startMilliseconds, Number.MAX_SAFE_INTEGER)
}

/**
 * Construct an `Interval` that includes all time equal to and before the
 * specified end time.
 *
 * @tsplus static ets/Schedule/Interval before
 */
export function before(endMilliseconds: number): Interval {
  return Interval(Number.MIN_SAFE_INTEGER, endMilliseconds)
}
