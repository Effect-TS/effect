/**
 * @since 1.0.0
 */
import type { Clock } from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"

/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol = Symbol.for("@effect/experimental/TimeToLive")

/**
 * @since 1.0.0
 * @category refinements
 */
export const isTimeToLive = (u: unknown): u is TimeToLive => Predicate.hasProperty(u, symbol)

/**
 * @since 1.0.0
 * @category models
 */
export interface TimeToLive<A = unknown, E = unknown> {
  readonly [symbol]: (exit: Exit.Exit<A, E>) => Duration.DurationInput
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const get = <A, E>(u: unknown, exit: Exit.Exit<A, E> = Exit.unit as any): Duration.Duration =>
  isTimeToLive(u) ? Duration.decode(u[symbol](exit)) : Duration.infinity

/**
 * @since 1.0.0
 * @category accessors
 */
export const getFinite = <A, E>(
  u: unknown,
  exit: Exit.Exit<A, E> = Exit.unit as any
): Option.Option<Duration.Duration> => {
  const value = get(u, exit)
  return Duration.isFinite(value) ? Option.some(value) : Option.none()
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const unsafeToExpires = (clock: Clock, ttl: Option.Option<Duration.Duration>): number | null =>
  ttl._tag === "None" ? null : clock.unsafeCurrentTimeMillis() + Duration.toMillis(ttl.value)
