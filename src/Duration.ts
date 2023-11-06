/**
 * @since 2.0.0
 */
import * as Equal from "./Equal.js"
import type * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as Hash from "./Hash.js"
import type { Inspectable } from "./Inspectable.js"
import { NodeInspectSymbol, toString } from "./Inspectable.js"
import * as Option from "./Option.js"
import * as order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import { hasProperty, isBigInt, isNumber } from "./Predicate.js"

const TypeId: unique symbol = Symbol.for("effect/Duration")

const bigint1e3 = BigInt(1_000)
const bigint1e9 = BigInt(1_000_000_000)

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Duration extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: DurationValue
}
/**
 * @since 2.0.0
 * @category models
 */
export type DurationValue =
  | { _tag: "Millis"; millis: number }
  | { _tag: "Nanos"; nanos: bigint }
  | { _tag: "Infinity" }

/**
 * @since 2.0.0
 * @category models
 */
export type Unit =
  | "nanos"
  | "micros"
  | "millis"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"

/**
 * @since 2.0.0
 * @category models
 */
export type DurationInput =
  | Duration
  | number // millis
  | bigint // nanos
  | `${number} ${Unit}`

const DURATION_REGEX = /^(-?\d+(?:\.\d+)?)\s+(nanos|micros|millis|seconds|minutes|hours|days|weeks)$/

/**
 * @since 2.0.0
 */
export const decode = (input: DurationInput): Duration => {
  if (isDuration(input)) {
    return input
  } else if (isNumber(input)) {
    return millis(input)
  } else if (isBigInt(input)) {
    return nanos(input)
  } else {
    DURATION_REGEX.lastIndex = 0 // Reset the lastIndex before each use
    const match = DURATION_REGEX.exec(input)
    if (match) {
      const [_, valueStr, unit] = match
      const value = Number(valueStr)
      switch (unit) {
        case "nanos":
          return nanos(BigInt(valueStr))
        case "micros":
          return micros(BigInt(valueStr))
        case "millis":
          return millis(value)
        case "seconds":
          return seconds(value)
        case "minutes":
          return minutes(value)
        case "hours":
          return hours(value)
        case "days":
          return days(value)
        case "weeks":
          return weeks(value)
      }
    }
  }
  throw new Error("Invalid duration input")
}

const zeroValue: DurationValue = { _tag: "Millis", millis: 0 }
const infinityValue: DurationValue = { _tag: "Infinity" }

const DurationProto: Omit<Duration, "value"> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: Duration): number {
    return Hash.structure(this.value)
  },
  [Equal.symbol](this: Duration, that: unknown): boolean {
    return isDuration(that) && equals(this, that)
  },
  toString(this: Duration) {
    return toString(this.toJSON())
  },
  toJSON(this: Duration) {
    switch (this.value._tag) {
      case "Millis":
        return { _id: "Duration", _tag: "Millis", millis: this.value.millis }
      case "Nanos":
        return { _id: "Duration", _tag: "Nanos", hrtime: toHrTime(this) }
      case "Infinity":
        return { _id: "Duration", _tag: "Infinity" }
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as const

const make = (input: number | bigint): Duration => {
  const duration = Object.create(DurationProto)
  if (isNumber(input)) {
    if (isNaN(input) || input < 0) {
      duration.value = zeroValue
    } else if (!Number.isFinite(input)) {
      duration.value = infinityValue
    } else if (!Number.isInteger(input)) {
      duration.value = { _tag: "Nanos", nanos: BigInt(Math.round(input * 1_000_000)) }
    } else {
      duration.value = { _tag: "Millis", millis: input }
    }
  } else if (input < BigInt(0)) {
    duration.value = zeroValue
  } else {
    duration.value = { _tag: "Nanos", nanos: input }
  }
  return duration
}

/**
 * @since 2.0.0
 * @category guards
 */
export const isDuration = (u: unknown): u is Duration => hasProperty(u, TypeId)

/**
 * @since 2.0.0
 * @category constructors
 */
export const zero: Duration = make(0)

/**
 * @since 2.0.0
 * @category constructors
 */
export const infinity: Duration = make(Infinity)

/**
 * @since 2.0.0
 * @category constructors
 */
export const nanos = (nanos: bigint): Duration => make(nanos)

/**
 * @since 2.0.0
 * @category constructors
 */
export const micros = (micros: bigint): Duration => make(micros * bigint1e3)

/**
 * @since 2.0.0
 * @category constructors
 */
export const millis = (millis: number): Duration => make(millis)

/**
 * @since 2.0.0
 * @category constructors
 */
export const seconds = (seconds: number): Duration => make(seconds * 1000)

/**
 * @since 2.0.0
 * @category constructors
 */
export const minutes = (minutes: number): Duration => make(minutes * 60_000)

/**
 * @since 2.0.0
 * @category constructors
 */
export const hours = (hours: number): Duration => make(hours * 3_600_000)

/**
 * @since 2.0.0
 * @category constructors
 */
export const days = (days: number): Duration => make(days * 86_400_000)

/**
 * @since 2.0.0
 * @category constructors
 */
export const weeks = (weeks: number): Duration => make(weeks * 604_800_000)

/**
 * @since 2.0.0
 * @category getters
 */
export const toMillis = (self: DurationInput): number => {
  const _self = decode(self)
  switch (_self.value._tag) {
    case "Infinity":
      return Infinity
    case "Nanos":
      return Number(_self.value.nanos) / 1_000_000
    case "Millis":
      return _self.value.millis
  }
}

/**
 * @since 2.0.0
 * @category getters
 */
export const toSeconds = (self: DurationInput): number => toMillis(self) / 1_000

/**
 * Get the duration in nanoseconds as a bigint.
 *
 * If the duration is infinite, returns `Option.none()`
 *
 * @since 2.0.0
 * @category getters
 */
export const toNanos = (self: DurationInput): Option.Option<bigint> => {
  const _self = decode(self)
  switch (_self.value._tag) {
    case "Infinity":
      return Option.none()
    case "Nanos":
      return Option.some(_self.value.nanos)
    case "Millis":
      return Option.some(BigInt(Math.round(_self.value.millis * 1_000_000)))
  }
}

/**
 * Get the duration in nanoseconds as a bigint.
 *
 * If the duration is infinite, it throws an error.
 *
 * @since 2.0.0
 * @category getters
 */
export const unsafeToNanos = (self: DurationInput): bigint => {
  const _self = decode(self)
  switch (_self.value._tag) {
    case "Infinity":
      throw new Error("Cannot convert infinite duration to nanos")
    case "Nanos":
      return _self.value.nanos
    case "Millis":
      return BigInt(Math.round(_self.value.millis * 1_000_000))
  }
}

/**
 * @since 2.0.0
 * @category getters
 */
export const toHrTime = (self: DurationInput): readonly [seconds: number, nanos: number] => {
  const _self = decode(self)
  switch (_self.value._tag) {
    case "Infinity":
      return [Infinity, 0]
    case "Nanos":
      return [
        Number(_self.value.nanos / bigint1e9),
        Number(_self.value.nanos % bigint1e9)
      ]
    case "Millis":
      return [
        Math.floor(_self.value.millis / 1000),
        Math.round((_self.value.millis % 1000) * 1_000_000)
      ]
  }
}

/**
 * @since 2.0.0
 * @category pattern matching
 */
export const match: {
  <A, B>(
    options: { readonly onMillis: (millis: number) => A; readonly onNanos: (nanos: bigint) => B }
  ): (self: DurationInput) => A | B
  <A, B>(
    self: DurationInput,
    options: { readonly onMillis: (millis: number) => A; readonly onNanos: (nanos: bigint) => B }
  ): A | B
} = dual(2, <A, B>(
  self: DurationInput,
  options: { readonly onMillis: (millis: number) => A; readonly onNanos: (nanos: bigint) => B }
): A | B => {
  const _self = decode(self)
  switch (_self.value._tag) {
    case "Nanos":
      return options.onNanos(_self.value.nanos)
    case "Infinity":
      return options.onMillis(Infinity)
    case "Millis":
      return options.onMillis(_self.value.millis)
  }
})

/**
 * @since 2.0.0
 * @category pattern matching
 */
export const matchWith: {
  <A, B>(
    that: DurationInput,
    options: {
      readonly onMillis: (self: number, that: number) => A
      readonly onNanos: (self: bigint, that: bigint) => B
    }
  ): (self: DurationInput) => A | B
  <A, B>(
    self: DurationInput,
    that: DurationInput,
    options: {
      readonly onMillis: (self: number, that: number) => A
      readonly onNanos: (self: bigint, that: bigint) => B
    }
  ): A | B
} = dual(3, <A, B>(
  self: DurationInput,
  that: DurationInput,
  options: {
    readonly onMillis: (self: number, that: number) => A
    readonly onNanos: (self: bigint, that: bigint) => B
  }
): A | B => {
  const _self = decode(self)
  const _that = decode(that)
  if (_self.value._tag === "Infinity" || _that.value._tag === "Infinity") {
    return options.onMillis(
      toMillis(_self),
      toMillis(_that)
    )
  } else if (_self.value._tag === "Nanos" || _that.value._tag === "Nanos") {
    const selfNanos = _self.value._tag === "Nanos" ?
      _self.value.nanos :
      BigInt(Math.round(_self.value.millis * 1_000_000))
    const thatNanos = _that.value._tag === "Nanos" ?
      _that.value.nanos :
      BigInt(Math.round(_that.value.millis * 1_000_000))
    return options.onNanos(selfNanos, thatNanos)
  }

  return options.onMillis(
    _self.value.millis,
    _that.value.millis
  )
})

/**
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<Duration> = order.make((self, that) =>
  matchWith(self, that, {
    onMillis: (self, that) => (self < that ? -1 : self > that ? 1 : 0),
    onNanos: (self, that) => (self < that ? -1 : self > that ? 1 : 0)
  })
)

/**
 * Checks if a `Duration` is between a `minimum` and `maximum` value.
 *
 * @category predicates
 * @since 2.0.0
 */
export const between: {
  (minimum: DurationInput, maximum: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, minimum: DurationInput, maximum: DurationInput): boolean
} = order.between(order.mapInput(Order, decode))

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<Duration> = (self, that) =>
  matchWith(self, that, {
    onMillis: (self, that) => self === that,
    onNanos: (self, that) => self === that
  })

const _min = order.min(Order)

/**
 * @since 2.0.0
 */
export const min: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
} = dual(2, (self: DurationInput, that: DurationInput): Duration => _min(decode(self), decode(that)))

const _max = order.max(Order)

/**
 * @since 2.0.0
 */
export const max: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
} = dual(2, (self: DurationInput, that: DurationInput): Duration => _max(decode(self), decode(that)))

const _clamp = order.clamp(Order)

/**
 * @since 2.0.0
 */
export const clamp: {
  (minimum: DurationInput, maximum: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, minimum: DurationInput, maximum: DurationInput): Duration
} = dual(
  3,
  (self: DurationInput, minimum: DurationInput, maximum: DurationInput): Duration =>
    _clamp(decode(self), decode(minimum), decode(maximum))
)

/**
 * @since 2.0.0
 * @category math
 */
export const times: {
  (times: number): (self: DurationInput) => Duration
  (self: DurationInput, times: number): Duration
} = dual(
  2,
  (self: DurationInput, times: number): Duration =>
    match(self, {
      onMillis: (millis) => make(millis * times),
      onNanos: (nanos) => make(nanos * BigInt(times))
    })
)

/**
 * @since 2.0.0
 * @category math
 */
export const sum: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
} = dual(
  2,
  (self: DurationInput, that: DurationInput): Duration =>
    matchWith(self, that, {
      onMillis: (self, that) => make(self + that),
      onNanos: (self, that) => make(self + that)
    })
)

/**
 * @since 2.0.0
 * @category predicates
 */
export const lessThan: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
} = dual(
  2,
  (self: DurationInput, that: DurationInput): boolean =>
    matchWith(self, that, {
      onMillis: (self, that) => self < that,
      onNanos: (self, that) => self < that
    })
)

/**
 * @since 2.0.0
 * @category predicates
 */
export const lessThanOrEqualTo: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
} = dual(
  2,
  (self: DurationInput, that: DurationInput): boolean =>
    matchWith(self, that, {
      onMillis: (self, that) => self <= that,
      onNanos: (self, that) => self <= that
    })
)

/**
 * @since 2.0.0
 * @category predicates
 */
export const greaterThan: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
} = dual(
  2,
  (self: DurationInput, that: DurationInput): boolean =>
    matchWith(self, that, {
      onMillis: (self, that) => self > that,
      onNanos: (self, that) => self > that
    })
)

/**
 * @since 2.0.0
 * @category predicates
 */
export const greaterThanOrEqualTo: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
} = dual(
  2,
  (self: DurationInput, that: DurationInput): boolean =>
    matchWith(self, that, {
      onMillis: (self, that) => self >= that,
      onNanos: (self, that) => self >= that
    })
)

/**
 * @since 2.0.0
 * @category predicates
 */
export const equals: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
} = dual(2, (self: DurationInput, that: DurationInput): boolean => Equivalence(decode(self), decode(that)))
