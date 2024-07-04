/**
 * @since 0.24.0
 */
import * as Duration from "effect/Duration"
import type * as bounded from "../Bounded.js"
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * @category instances
 * @since 0.24.0
 */
export const Bounded: bounded.Bounded<Duration.Duration> = {
  compare: Duration.Order,
  maxBound: Duration.infinity,
  minBound: Duration.zero
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemigroupSum: semigroup.Semigroup<Duration.Duration> = semigroup.make(Duration.sum)

/**
 * @category instances
 * @since 0.24.0
 */
export const MonoidSum: monoid.Monoid<Duration.Duration> = monoid.fromSemigroup(
  SemigroupSum,
  Duration.zero
)

/**
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMax: semigroup.Semigroup<Duration.Duration> = semigroup.make(Duration.max)

/**
 * @category instances
 * @since 0.24.0
 */
export const MonoidMax: monoid.Monoid<Duration.Duration> = monoid.fromSemigroup(
  SemigroupMax,
  Duration.zero
)

/**
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMin: semigroup.Semigroup<Duration.Duration> = semigroup.make(Duration.min)

/**
 * @category instances
 * @since 0.24.0
 */
export const MonoidMin: monoid.Monoid<Duration.Duration> = monoid.fromSemigroup(
  SemigroupMin,
  Duration.infinity
)
