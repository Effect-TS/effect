import { Interval } from "@effect/core/io/Schedule/Interval"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const IntervalsSym = Symbol.for("@effect/core/io/Schedule/Intervals")

/**
 * @category symbol
 * @since 1.0.0
 */
export type IntervalsSym = typeof IntervalsSym

/**
 * Intervals represents a set of intervals.
 *
 * @tsplus type effect/core/io/Schedule/Intervals
 * @category model
 * @since 1.0.0
 */
export interface Intervals {
  readonly [IntervalsSym]: IntervalsSym
  readonly intervals: List.List<Interval>
}

/**
 * @tsplus type effect/core/io/Schedule/Intervals.Ops
 * @category model
 * @since 1.0.0
 */
export interface IntervalsOps {
  $: IntervalsAspects
}
export const Intervals: IntervalsOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Schedule/Intervals.Aspects
 * @category model
 * @since 1.0.0
 */
export interface IntervalsAspects {}

/**
 * @tsplus static effect/core/io/Schedule/Intervals.Ops __call
 * @tsplus static effect/core/io/Schedule/Intervals.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make(intervals: List.List<Interval>): Intervals {
  return {
    [IntervalsSym]: IntervalsSym,
    intervals
  }
}

/**
 * The empty set of intervals.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export const empty: Intervals = Intervals(List.empty())

/**
 * Constructs a set of intervals from the specified intervals.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops fromIntervals
 * @category constructors
 * @since 1.0.0
 */
export function fromIntervals(...intervals: Array<Interval>): Intervals {
  return intervals.reduce(
    (intervals, interval) => intervals.union(Intervals(List.of(interval))),
    Intervals.empty
  )
}

/**
 * Produces the union of this set of intervals and the specified set of intervals.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule/Intervals ||
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects union
 * @tsplus pipeable effect/core/io/Schedule/Intervals union
 * @category mutations
 * @since 1.0.0
 */
export function union(that: Intervals) {
  return (self: Intervals): Intervals => {
    if (List.isNil(that.intervals)) {
      return self
    }
    if (List.isNil(self.intervals)) {
      return that
    }
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
  self: List.List<Interval>,
  that: List.List<Interval>,
  interval: Interval,
  acc: List.List<Interval>
): Intervals {
  switch (self._tag) {
    case "Nil": {
      switch (that._tag) {
        case "Nil": {
          return Intervals(pipe(acc, List.prepend(interval), List.reverse))
        }
        case "Cons": {
          // const { head: right, tail: rights } = that
          if (interval.endMillis < that.head.startMillis) {
            return unionLoop(List.nil(), that.tail, that.head, pipe(acc, List.prepend(interval)))
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
          if (interval.endMillis < self.head.startMillis) {
            return unionLoop(self.tail, List.nil(), self.head, pipe(acc, List.prepend(interval)))
          }
          return unionLoop(
            self.tail,
            List.nil(),
            Interval(interval.startMillis, self.head.endMillis),
            acc
          )
        }
        case "Cons": {
          if (self.head.startMillis < that.head.startMillis) {
            if (interval.endMillis < self.head.startMillis) {
              return unionLoop(self.tail, that, self.head, pipe(acc, List.prepend(interval)))
            }
            return unionLoop(
              self.tail,
              that,
              Interval(interval.startMillis, self.head.endMillis),
              acc
            )
          }
          if (interval.endMillis < that.head.startMillis) {
            return unionLoop(self, that.tail, that.head, pipe(acc, List.prepend(interval)))
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
 * @category mutations
 * @since 1.0.0
 */
export function intersect(that: Intervals) {
  return (self: Intervals): Intervals => intersectLoop(self.intervals, that.intervals, List.nil())
}

/**
 * @tsplus tailRec
 */
function intersectLoop(
  left: List.List<Interval>,
  right: List.List<Interval>,
  acc: List.List<Interval>
): Intervals {
  if (List.isNil(left) || List.isNil(right)) {
    return Intervals(List.reverse(acc))
  }
  const interval = left.head.intersect(right.head)
  const intervals = interval.isEmpty ? acc : pipe(acc, List.prepend(interval))
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
 * @category getters
 * @since 1.0.0
 */
export function start(self: Intervals): number {
  return pipe(
    self.intervals,
    List.head,
    Option.getOrElse(Interval.empty)
  ).startMillis
}

/**
 * The end of the latest interval in this set.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Ops end
 * @tsplus getter effect/core/io/Schedule/Intervals end
 * @category getters
 * @since 1.0.0
 */
export function end(self: Intervals): number {
  return pipe(
    self.intervals,
    List.head,
    Option.getOrElse(Interval.empty)
  ).endMillis
}

/**
 * Whether the start of this set of intervals is before the start of the
 * specified set of intervals.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule/Intervals <
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects lessThan
 * @tsplus pipeable effect/core/io/Schedule/Intervals lessThan
 * @category ordering
 * @since 1.0.0
 */
export function lessThan(that: Intervals) {
  return (self: Intervals): boolean => self.start < that.start
}

/**
 * Returns whether this set of intervals is empty.
 *
 * @tsplus getter effect/core/io/Schedule/Intervals isNonEmpty
 * @category getters
 * @since 1.0.0
 */
export function isNonEmpty(self: Intervals): boolean {
  return List.isCons(self.intervals)
}

/**
 * The set of intervals that starts last.
 *
 * @tsplus static effect/core/io/Schedule/Intervals.Aspects max
 * @tsplus pipeable effect/core/io/Schedule/Intervals max
 * @category ordering
 * @since 1.0.0
 */
export function max(that: Intervals) {
  return (self: Intervals): Intervals => self.lessThan(that) ? that : self
}
