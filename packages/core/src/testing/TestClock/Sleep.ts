import type { Duration } from "@fp-ts/data/Duration"

/**
 * `Sleep` represents the state of a scheduled effect, including the time the
 * effect is scheduled to run, a promise that can be completed to resume
 * execution of the effect, and the fiber executing the effect.
 *
 * @tsplus type effect/core/testing/TestClock.Sleep
 * @category model
 * @since 1.0.0
 */
export interface Sleep {
  readonly duration: Duration
  readonly deferred: Deferred<never, void>
  readonly fiberId: FiberId
}

/**
 * @tsplus type effect/core/testing/TestClock.Sleep.Ops
 * @category model
 * @since 1.0.0
 */
export interface SleepOps {
  (
    duration: Duration,
    deferred: Deferred<never, void>,
    fiberId: FiberId
  ): Sleep
}
/**
 * @tsplus static effect/core/testing/TestClock.Ops Sleep
 * @category constructors
 * @since 1.0.0
 */
export const Sleep: SleepOps = (duration, deferred, fiberId) => ({
  duration,
  deferred,
  fiberId
})
