/**
 * `Sleep` represents the state of a scheduled effect, including the time the
 * effect is scheduled to run, a promise that can be completed to resume
 * execution of the effect, and the fiber executing the effect.
 *
 * @tsplus type effect/core/testing/TestClock.Sleep
 */
export interface Sleep {
  readonly duration: Duration
  readonly deferred: Deferred<never, void>
  readonly fiberId: FiberId
}

/**
 * @tsplus type effect/core/testing/TestClock.Sleep.Ops
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
 */
export const Sleep: SleepOps = (duration, deferred, fiberId) => ({
  duration,
  deferred,
  fiberId
})
