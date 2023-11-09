import * as Duration from "../../Duration.js"
import { dual } from "../../Function.js"
import * as Option from "../../Option.js"
import type * as Interval from "../../ScheduleInterval.js"

/** @internal */
const IntervalSymbolKey = "effect/ScheduleInterval"

/** @internal */
export const IntervalTypeId: Interval.IntervalTypeId = Symbol.for(
  IntervalSymbolKey
) as Interval.IntervalTypeId

/** @internal */
export const empty: Interval.ScheduleInterval = {
  [IntervalTypeId]: IntervalTypeId,
  startMillis: 0,
  endMillis: 0
}

/** @internal */
export const make = (startMillis: number, endMillis: number): Interval.ScheduleInterval => {
  if (startMillis > endMillis) {
    return empty
  }
  return {
    [IntervalTypeId]: IntervalTypeId,
    startMillis,
    endMillis
  }
}

/** @internal */
export const lessThan = dual<
  (that: Interval.ScheduleInterval) => (self: Interval.ScheduleInterval) => boolean,
  (self: Interval.ScheduleInterval, that: Interval.ScheduleInterval) => boolean
>(2, (self, that) => min(self, that) === self)

/** @internal */
export const min = dual<
  (that: Interval.ScheduleInterval) => (self: Interval.ScheduleInterval) => Interval.ScheduleInterval,
  (self: Interval.ScheduleInterval, that: Interval.ScheduleInterval) => Interval.ScheduleInterval
>(2, (self, that) => {
  if (self.endMillis <= that.startMillis) return self
  if (that.endMillis <= self.startMillis) return that
  if (self.startMillis < that.startMillis) return self
  if (that.startMillis < self.startMillis) return that
  if (self.endMillis <= that.endMillis) return self
  return that
})

/** @internal */
export const max = dual<
  (that: Interval.ScheduleInterval) => (self: Interval.ScheduleInterval) => Interval.ScheduleInterval,
  (self: Interval.ScheduleInterval, that: Interval.ScheduleInterval) => Interval.ScheduleInterval
>(2, (self, that) => min(self, that) === self ? that : self)

/** @internal */
export const isEmpty = (self: Interval.ScheduleInterval): boolean => {
  return self.startMillis >= self.endMillis
}

/** @internal */
export const isNonEmpty = (self: Interval.ScheduleInterval): boolean => {
  return !isEmpty(self)
}

/** @internal */
export const intersect = dual<
  (that: Interval.ScheduleInterval) => (self: Interval.ScheduleInterval) => Interval.ScheduleInterval,
  (self: Interval.ScheduleInterval, that: Interval.ScheduleInterval) => Interval.ScheduleInterval
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return make(start, end)
})

/** @internal */
export const size = (self: Interval.ScheduleInterval): Duration.Duration => {
  return Duration.millis(self.endMillis - self.startMillis)
}

/** @internal */
export const union = dual<
  (that: Interval.ScheduleInterval) => (self: Interval.ScheduleInterval) => Option.Option<Interval.ScheduleInterval>,
  (self: Interval.ScheduleInterval, that: Interval.ScheduleInterval) => Option.Option<Interval.ScheduleInterval>
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return start < end ? Option.none() : Option.some(make(start, end))
})

/** @internal */
export const after = (startMilliseconds: number): Interval.ScheduleInterval => {
  return make(startMilliseconds, Number.POSITIVE_INFINITY)
}

/** @internal */
export const before = (endMilliseconds: number): Interval.ScheduleInterval => {
  return make(Number.NEGATIVE_INFINITY, endMilliseconds)
}
