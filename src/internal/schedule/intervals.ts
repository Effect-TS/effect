import { Chunk } from "../../Chunk.js"
import { dual, pipe } from "../../Function.js"
import { Option } from "../../Option.js"
import { Interval } from "../../ScheduleInterval.js"
import type { ScheduleIntervals } from "../../ScheduleIntervals.js"

/** @internal */
const IntervalsSymbolKey = "effect/ScheduleIntervals"

/** @internal */
export const IntervalsTypeId: ScheduleIntervals.IntervalsTypeId = Symbol.for(
  IntervalsSymbolKey
) as ScheduleIntervals.IntervalsTypeId

/** @internal */
export const make = (intervals: Chunk<Interval>): ScheduleIntervals => {
  return {
    [IntervalsTypeId]: IntervalsTypeId,
    intervals
  }
}
/** @internal */
export const empty: ScheduleIntervals = make(Chunk.empty())

/** @internal */
export const fromIterable = (intervals: Iterable<Interval>): ScheduleIntervals =>
  Array.from(intervals).reduce(
    (intervals, interval) => pipe(intervals, union(make(Chunk.of(interval)))),
    empty
  )

/** @internal */
export const union = dual<
  (that: ScheduleIntervals) => (self: ScheduleIntervals) => ScheduleIntervals,
  (self: ScheduleIntervals, that: ScheduleIntervals) => ScheduleIntervals
>(2, (self, that) => {
  if (!Chunk.isNonEmpty(that.intervals)) {
    return self
  }
  if (!Chunk.isNonEmpty(self.intervals)) {
    return that
  }
  if (Chunk.headNonEmpty(self.intervals).startMillis < Chunk.headNonEmpty(that.intervals).startMillis) {
    return unionLoop(
      Chunk.tailNonEmpty(self.intervals),
      that.intervals,
      Chunk.headNonEmpty(self.intervals),
      Chunk.empty()
    )
  }
  return unionLoop(
    self.intervals,
    Chunk.tailNonEmpty(that.intervals),
    Chunk.headNonEmpty(that.intervals),
    Chunk.empty()
  )
})

/** @internal */
const unionLoop = (
  _self: Chunk<Interval>,
  _that: Chunk<Interval>,
  _interval: Interval,
  _acc: Chunk<Interval>
): ScheduleIntervals => {
  let self = _self
  let that = _that
  let interval = _interval
  let acc = _acc
  while (Chunk.isNonEmpty(self) || Chunk.isNonEmpty(that)) {
    if (!Chunk.isNonEmpty(self) && Chunk.isNonEmpty(that)) {
      if (interval.endMillis < Chunk.headNonEmpty(that).startMillis) {
        acc = pipe(acc, Chunk.prepend(interval))
        interval = Chunk.headNonEmpty(that)
        that = Chunk.tailNonEmpty(that)
        self = Chunk.empty()
      } else {
        interval = Interval.make(interval.startMillis, Chunk.headNonEmpty(that).endMillis)
        that = Chunk.tailNonEmpty(that)
        self = Chunk.empty()
      }
    } else if (Chunk.isNonEmpty(self) && Chunk.isEmpty(that)) {
      if (interval.endMillis < Chunk.headNonEmpty(self).startMillis) {
        acc = pipe(acc, Chunk.prepend(interval))
        interval = Chunk.headNonEmpty(self)
        that = Chunk.empty()
        self = Chunk.tailNonEmpty(self)
      } else {
        interval = Interval.make(interval.startMillis, Chunk.headNonEmpty(self).endMillis)
        that = Chunk.empty()
        self = Chunk.tailNonEmpty(self)
      }
    } else if (Chunk.isNonEmpty(self) && Chunk.isNonEmpty(that)) {
      if (Chunk.headNonEmpty(self).startMillis < Chunk.headNonEmpty(that).startMillis) {
        if (interval.endMillis < Chunk.headNonEmpty(self).startMillis) {
          acc = pipe(acc, Chunk.prepend(interval))
          interval = Chunk.headNonEmpty(self)
          self = Chunk.tailNonEmpty(self)
        } else {
          interval = Interval.make(interval.startMillis, Chunk.headNonEmpty(self).endMillis)
          self = Chunk.tailNonEmpty(self)
        }
      } else if (interval.endMillis < Chunk.headNonEmpty(that).startMillis) {
        acc = pipe(acc, Chunk.prepend(interval))
        interval = Chunk.headNonEmpty(that)
        that = Chunk.tailNonEmpty(that)
      } else {
        interval = Interval.make(interval.startMillis, Chunk.headNonEmpty(that).endMillis)
        that = Chunk.tailNonEmpty(that)
      }
    } else {
      throw new Error(
        "BUG: ScheduleIntervals.unionLoop - please report an issue at https://github.com/Effect-TS/io/issues"
      )
    }
  }
  return make(pipe(acc, Chunk.prepend(interval), Chunk.reverse))
}

/** @internal */
export const intersect = dual<
  (that: ScheduleIntervals) => (self: ScheduleIntervals) => ScheduleIntervals,
  (self: ScheduleIntervals, that: ScheduleIntervals) => ScheduleIntervals
>(2, (self, that) => intersectLoop(self.intervals, that.intervals, Chunk.empty()))

/** @internal */
const intersectLoop = (
  _left: Chunk<Interval>,
  _right: Chunk<Interval>,
  _acc: Chunk<Interval>
): ScheduleIntervals => {
  let left = _left
  let right = _right
  let acc = _acc
  while (Chunk.isNonEmpty(left) && Chunk.isNonEmpty(right)) {
    const interval = pipe(Chunk.headNonEmpty(left), Interval.intersect(Chunk.headNonEmpty(right)))
    const intervals = Interval.isEmpty(interval) ? acc : pipe(acc, Chunk.prepend(interval))
    if (pipe(Chunk.headNonEmpty(left), Interval.lessThan(Chunk.headNonEmpty(right)))) {
      left = Chunk.tailNonEmpty(left)
    } else {
      right = Chunk.tailNonEmpty(right)
    }
    acc = intervals
  }
  return make(Chunk.reverse(acc))
}

/** @internal */
export const start = (self: ScheduleIntervals): number => {
  return pipe(
    self.intervals,
    Chunk.head,
    Option.getOrElse(() => Interval.empty)
  ).startMillis
}

/** @internal */
export const end = (self: ScheduleIntervals): number => {
  return pipe(
    self.intervals,
    Chunk.head,
    Option.getOrElse(() => Interval.empty)
  ).endMillis
}

/** @internal */
export const lessThan = dual<
  (that: ScheduleIntervals) => (self: ScheduleIntervals) => boolean,
  (self: ScheduleIntervals, that: ScheduleIntervals) => boolean
>(2, (self, that) => start(self) < start(that))

/** @internal */
export const isNonEmpty = (self: ScheduleIntervals): boolean => {
  return Chunk.isNonEmpty(self.intervals)
}

/** @internal */
export const max = dual<
  (that: ScheduleIntervals) => (self: ScheduleIntervals) => ScheduleIntervals,
  (self: ScheduleIntervals, that: ScheduleIntervals) => ScheduleIntervals
>(2, (self, that) => lessThan(self, that) ? that : self)
