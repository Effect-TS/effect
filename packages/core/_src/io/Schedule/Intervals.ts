import { Interval } from "@effect/core/io/Schedule/Interval"

export const IntervalsSym = Symbol.for("@effect/core/io/Schedule/Intervals")
export type IntervalsSym = typeof IntervalsSym

/**
 * Intervals represents a set of intervals.
 *
 * @tsplus type effect/core/io/Schedule/Intervals
 */
export interface Intervals {
  readonly [IntervalsSym]: IntervalsSym
  readonly intervals: List<Interval>
}

/**
 * @tsplus type effect/core/io/Schedule/Intervals.Ops
 */
export interface IntervalsOps {
  $: IntervalsAspects
}
export const Intervals: IntervalsOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Schedule/Intervals.Aspects
 */
export interface IntervalsAspects {}

/**
 * @tsplus static effect/core/io/Schedule/Intervals.Ops __call
 * @tsplus static effect/core/io/Schedule/Intervals.Ops make
 */
export function make(intervals: List<Interval>): Intervals {
  return {
    [IntervalsSym]: IntervalsSym,
    intervals
  }
}

/**
 * The empty set of intervals.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops empty
 */
export const empty: Intervals = Intervals(List.empty())

/**
 * Constructs a set of intervals from the specified intervals.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops fromIntervals
 */
export function fromIntervals(...intervals: Array<Interval>): Intervals {
  return intervals.reduce(
    (intervals, interval) => intervals.union(Intervals(List(interval))),
    Intervals.empty
  )
}

/**
 * Produces the union of this set of intervals and the specified set of intervals.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule/Intervals ||
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects union
 * @tsplus pipeable effect/core/io/Schedule/Intervals union
 */
export function union(that: Intervals) {
  return (self: Intervals): Intervals => {
    if (that.intervals.isNil()) {
      return self
    }
    if (self.intervals.isNil()) {
      return that
    }
    // const { head: left, tail: lefts } = self.intervals
    // const { head: right, tail: rights } = that.intervals
    if (self.intervals.head.startMillis < that.intervals.head.startMillis) {
      return unionLoop(self.intervals.tail, that.intervals, self.intervals.head, List.nil())
    }
    return unionLoop(self.intervals, that.intervals.tail, that.intervals.head, List.nil())
  }
}

/**
 * @tsplus tailRec
 */
function unionLoop(
  self: List<Interval>,
  that: List<Interval>,
  interval: Interval,
  acc: List<Interval>
): Intervals {
  switch (self._tag) {
    case "Nil": {
      switch (that._tag) {
        case "Nil": {
          return Intervals(acc.prepend(interval).reverse)
        }
        case "Cons": {
          // const { head: right, tail: rights } = that
          if (interval.endMillis < that.head.startMillis) {
            return unionLoop(List.nil(), that.tail, that.head, acc.prepend(interval))
          }
          return unionLoop(
            List.nil(),
            that.tail,
            Interval(interval.startMillis, that.head.endMillis),
            acc
          )
        }
      }
    }
    case "Cons": {
      switch (that._tag) {
        case "Nil": {
          // const { head: left, tail: lefts } = self
          if (interval.endMillis < self.head.startMillis) {
            return unionLoop(self.tail, List.nil(), self.head, acc.prepend(interval))
          }
          return unionLoop(
            self.tail,
            List.nil(),
            Interval(interval.startMillis, self.head.endMillis),
            acc
          )
        }
        case "Cons": {
          // const { head: left, tail: lefts } = self
          // const { head: right, tail: rights } = that
          if (self.head.startMillis < that.head.startMillis) {
            if (interval.endMillis < self.head.startMillis) {
              return unionLoop(self.tail, that, self.head, acc.prepend(interval))
            }
            return unionLoop(
              self.tail,
              that,
              Interval(interval.startMillis, self.head.endMillis),
              acc
            )
          }
          if (interval.endMillis < that.head.startMillis) {
            return unionLoop(self, that.tail, that.head, acc.prepend(interval))
          }
          return unionLoop(
            self,
            that.tail,
            Interval(interval.startMillis, that.head.endMillis),
            acc
          )
        }
      }
    }
  }
}

/**
 * Produces the intersection of this set of intervals and the specified set of intervals.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule/Intervals &&
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects intersect
 * @tsplus pipeable effect/core/io/Schedule/Intervals intersect
 */
export function intersect(that: Intervals) {
  return (self: Intervals): Intervals => intersectLoop(self.intervals, that.intervals, List.nil())
}

/**
 * @tsplus tailRec
 */
function intersectLoop(
  left: List<Interval>,
  right: List<Interval>,
  acc: List<Interval>
): Intervals {
  if (left.isNil() || right.isNil()) {
    return Intervals(acc.reverse)
  }
  const interval = left.head.intersect(right.head)
  const intervals = interval.isEmpty ? acc : acc.prepend(interval)
  if (left.head.lessThan(right.head)) {
    return intersectLoop(left.tail, right, intervals)
  }
  return intersectLoop(left, right.tail, intervals)
}

/**
 * The start of the earliest interval in this set.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops start
 * @tsplus getter effect/core/io/Schedule/Intervals start
 */
export function start(self: Intervals): number {
  return self.intervals.head.getOrElse(Interval.empty).startMillis
}

/**
 * The end of the latest interval in this set.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops end
 * @tsplus getter effect/core/io/Schedule/Intervals end
 */
export function end(self: Intervals): number {
  return self.intervals.head.getOrElse(Interval.empty).endMillis
}

/**
 * Whether the start of this set of intervals is before the start of the
 * specified set of intervals.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule/Intervals <
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects lessThan
 * @tsplus pipeable effect/core/io/Schedule/Intervals lessThan
 */
export function lessThan(that: Intervals) {
  return (self: Intervals): boolean => self.start < that.start
}

/**
 * Returns whether this set of intervals is empty.
 *
 * @tsplus getter effect/core/io/Schedule/Intervals isNonEmpty
 */
export function isNonEmpty(self: Intervals): boolean {
  return self.intervals.isCons()
}

/**
 * The set of intervals that starts last.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects max
 * @tsplus pipeable effect/core/io/Schedule/Intervals max
 */
export function max(that: Intervals) {
  return (self: Intervals): Intervals => self.lessThan(that) ? that : self
}
