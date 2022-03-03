import * as St from "../prelude/Structural"

export const DurationSym = Symbol.for("@effect-ts/core/data/Duration")
export type DurationSym = typeof DurationSym

/**
 * @tsplus type ets/Duration
 * @tsplus companion ets/DurationOps
 */
export class Duration implements St.HasHash, St.HasEquals {
  readonly [DurationSym]: DurationSym

  constructor(readonly milliseconds: number) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hash(this[DurationSym]), St.hashNumber(this.milliseconds))
  }

  [St.equalsSym](that: unknown): boolean {
    return isDuration(that) && St.hash(this) == St.hash(that)
  }
}

/**
 * @tsplus static ets/DurationOps isDuration
 */
export function isDuration(u: unknown): u is Duration {
  return typeof u === "object" && u != null && DurationSym in u
}

/**
 * @tsplus static ets/DurationOps __call
 */
export function fromMilliseconds(milliseconds: number): Duration {
  if (milliseconds < 0) return zero
  return new Duration(milliseconds)
}

/**
 * @tsplus static ets/DurationOps fromSeconds
 */
export function fromSeconds(seconds: number): Duration {
  return fromMilliseconds(seconds * 1000)
}

/**
 * @tsplus static ets/DurationOps fromMinutes
 */
export function fromMinutes(minutes: number): Duration {
  return fromMilliseconds(minutes * 1000 * 60)
}

/**
 * @tsplus static ets/DurationOps fromHours
 */
export function fromHours(hours: number): Duration {
  return fromMilliseconds(hours * 1000 * 60 * 60)
}

/**
 * @tsplus static ets/DurationOps fromDays
 */
export function fromDays(days: number): Duration {
  return fromMilliseconds(days * 1000 * 60 * 60 * 24)
}

/**
 * @tsplus static ets/DurationOps fromInterval
 */
export function fromInterval(start: Date, end: Date): Duration {
  return Duration(end.getTime() - start.getTime())
}

/**
 * @tsplus static ets/DurationOps Infinity
 */
export const infinity: Duration = fromMilliseconds(Number.POSITIVE_INFINITY)

/**
 * @tsplus static ets/DurationOps Zero
 */
export const zero: Duration = fromMilliseconds(0)

// def +(other: Duration): Duration = {
//   val thisNanos  = if (duration.toNanos > 0) duration.toNanos else 0
//   val otherNanos = if (other.toNanos > 0) other.toNanos else 0
//   val sum        = thisNanos + otherNanos
//   if (sum >= 0) sum.nanos else Duration.Infinity
// }

/**
 * Adds two durations together.
 *
 * @tsplus operator ets/Duration +
 * @tsplus fluent ets/Duration add
 */
export function add_(self: Duration, that: Duration): Duration {
  if (
    self.milliseconds >= Number.MAX_SAFE_INTEGER ||
    that.milliseconds >= Number.MAX_SAFE_INTEGER ||
    self.milliseconds + that.milliseconds >= Number.MAX_SAFE_INTEGER
  ) {
    return infinity
  }
  return Duration(self.milliseconds + that.milliseconds)
}

/**
 * Adds two durations together.
 *
 * @ets_data_first add_
 */
export function add(that: Duration) {
  return (self: Duration): Duration => self + that
}

/**
 * Subtracts one duration from another.
 *
 * @tsplus operator ets/Duration -
 * @tsplus fluent ets/Duration subtract
 */
export function subtract_(self: Duration, that: Duration): Duration {
  return Duration(self.milliseconds - that.milliseconds)
}

/**
 * Subtracts one duration from another.
 *
 * @ets_data_first subtract_
 */
export function subtract(that: Duration) {
  return (self: Duration): Duration => self - that
}

/**
 * Multiplies a duration by the given factor.
 *
 * @tsplus operator ets/Duration *
 * @tsplus fluent ets/Duration multiply
 */
export function multiply_(self: Duration, factor: number): Duration {
  if (factor <= 0 || self.milliseconds <= 0) {
    return Duration(0)
  }
  if (factor <= Number.MAX_VALUE / self.milliseconds) {
    return Duration(Math.round(self.milliseconds * factor))
  }
  return infinity
}

/**
 * Multiplies a duration by the given factor.
 *
 * @ets_data_first multiply_
 */
export function multiply(factor: number) {
  return (self: Duration): Duration => self * factor
}

/**
 * @tsplus operator ets/Duration >
 * @tsplus fluent ets/Duration greaterThan
 */
export function greaterThan_(self: Duration, that: Duration): boolean {
  return self.milliseconds > that.milliseconds
}

/**
 * @ets_data_first greaterThan_
 */
export function greaterThan(that: Duration) {
  return (self: Duration): boolean => self > that
}

/**
 * @tsplus operator ets/Duration <
 * @tsplus fluent ets/Duration lessThan
 */
export function lessThan_(self: Duration, that: Duration): boolean {
  return self.milliseconds < that.milliseconds
}

/**
 * @ets_data_first lessThan_
 */
export function lessThan(that: Duration) {
  return (self: Duration): boolean => self < that
}

/**
 * @tsplus operator ets/Duration >=
 * @tsplus fluent ets/Duration greaterThanEqual
 */
export function greaterThanEqual_(self: Duration, that: Duration): boolean {
  return self.milliseconds >= that.milliseconds
}

/**
 * @ets_data_first greaterThanEqual_
 */
export function greaterThanEqual(that: Duration) {
  return (self: Duration): boolean => self >= that
}

/**
 * @tsplus operator ets/Duration <=
 * @tsplus fluent ets/Duration lessThanEqual
 */
export function lessThanEqual_(self: Duration, that: Duration): boolean {
  return self.milliseconds <= that.milliseconds
}

/**
 * @ets_data_first lessThanEqual_
 */
export function lessThanEqual(that: Duration) {
  return (self: Duration): boolean => self <= that
}

/**
 * @tsplus fluent ets/Duration max
 */
export function max_(self: Duration, that: Duration): Duration {
  return self > that ? self : that
}

/**
 * @ets_data_first max_
 */
export function max(that: Duration) {
  return (self: Duration): Duration => self.max(that)
}

/**
 * @tsplus fluent ets/Duration min
 */
export function min_(self: Duration, that: Duration): Duration {
  return self < that ? self : that
}

/**
 * @ets_data_first max_
 */
export function min(that: Duration) {
  return (self: Duration): Duration => self.max(that)
}
