import { Duration } from "../../exports/Duration.js"
import { dual } from "../../exports/Function.js"
import { Option } from "../../exports/Option.js"
import type { Interval } from "../../exports/ScheduleInterval.js"

/** @internal */
const IntervalSymbolKey = "effect/ScheduleInterval"

/** @internal */
export const IntervalTypeId: Interval.IntervalTypeId = Symbol.for(
  IntervalSymbolKey
) as Interval.IntervalTypeId

/** @internal */
export const empty: Interval = {
  [IntervalTypeId]: IntervalTypeId,
  startMillis: 0,
  endMillis: 0
}

/** @internal */
export const make = (startMillis: number, endMillis: number): Interval => {
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
  (that: Interval) => (self: Interval) => boolean,
  (self: Interval, that: Interval) => boolean
>(2, (self, that) => min(self, that) === self)

/** @internal */
export const min = dual<
  (that: Interval) => (self: Interval) => Interval,
  (self: Interval, that: Interval) => Interval
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
  (that: Interval) => (self: Interval) => Interval,
  (self: Interval, that: Interval) => Interval
>(2, (self, that) => min(self, that) === self ? that : self)

/** @internal */
export const isEmpty = (self: Interval): boolean => {
  return self.startMillis >= self.endMillis
}

/** @internal */
export const isNonEmpty = (self: Interval): boolean => {
  return !isEmpty(self)
}

/** @internal */
export const intersect = dual<
  (that: Interval) => (self: Interval) => Interval,
  (self: Interval, that: Interval) => Interval
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return make(start, end)
})

/** @internal */
export const size = (self: Interval): Duration => {
  return Duration.millis(self.endMillis - self.startMillis)
}

/** @internal */
export const union = dual<
  (that: Interval) => (self: Interval) => Option<Interval>,
  (self: Interval, that: Interval) => Option<Interval>
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return start < end ? Option.none() : Option.some(make(start, end))
})

/** @internal */
export const after = (startMilliseconds: number): Interval => {
  return make(startMilliseconds, Number.POSITIVE_INFINITY)
}

/** @internal */
export const before = (endMilliseconds: number): Interval => {
  return make(Number.NEGATIVE_INFINITY, endMilliseconds)
}
