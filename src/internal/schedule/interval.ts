import { Duration } from "../../Duration.js"
import { dual } from "../../Function.js"
import { Option } from "../../Option.js"
import type { ScheduleInterval } from "../../ScheduleInterval.js"

/** @internal */
const IntervalSymbolKey = "effect/ScheduleInterval"

/** @internal */
export const IntervalTypeId: ScheduleInterval.IntervalTypeId = Symbol.for(
  IntervalSymbolKey
) as ScheduleInterval.IntervalTypeId

/** @internal */
export const empty: ScheduleInterval = {
  [IntervalTypeId]: IntervalTypeId,
  startMillis: 0,
  endMillis: 0
}

/** @internal */
export const make = (startMillis: number, endMillis: number): ScheduleInterval => {
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
  (that: ScheduleInterval) => (self: ScheduleInterval) => boolean,
  (self: ScheduleInterval, that: ScheduleInterval) => boolean
>(2, (self, that) => min(self, that) === self)

/** @internal */
export const min = dual<
  (that: ScheduleInterval) => (self: ScheduleInterval) => ScheduleInterval,
  (self: ScheduleInterval, that: ScheduleInterval) => ScheduleInterval
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
  (that: ScheduleInterval) => (self: ScheduleInterval) => ScheduleInterval,
  (self: ScheduleInterval, that: ScheduleInterval) => ScheduleInterval
>(2, (self, that) => min(self, that) === self ? that : self)

/** @internal */
export const isEmpty = (self: ScheduleInterval): boolean => {
  return self.startMillis >= self.endMillis
}

/** @internal */
export const isNonEmpty = (self: ScheduleInterval): boolean => {
  return !isEmpty(self)
}

/** @internal */
export const intersect = dual<
  (that: ScheduleInterval) => (self: ScheduleInterval) => ScheduleInterval,
  (self: ScheduleInterval, that: ScheduleInterval) => ScheduleInterval
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return make(start, end)
})

/** @internal */
export const size = (self: ScheduleInterval): Duration => {
  return Duration.millis(self.endMillis - self.startMillis)
}

/** @internal */
export const union = dual<
  (that: ScheduleInterval) => (self: ScheduleInterval) => Option<ScheduleInterval>,
  (self: ScheduleInterval, that: ScheduleInterval) => Option<ScheduleInterval>
>(2, (self, that) => {
  const start = Math.max(self.startMillis, that.startMillis)
  const end = Math.min(self.endMillis, that.endMillis)
  return start < end ? Option.none() : Option.some(make(start, end))
})

/** @internal */
export const after = (startMilliseconds: number): ScheduleInterval => {
  return make(startMilliseconds, Number.POSITIVE_INFINITY)
}

/** @internal */
export const before = (endMilliseconds: number): ScheduleInterval => {
  return make(Number.NEGATIVE_INFINITY, endMilliseconds)
}
