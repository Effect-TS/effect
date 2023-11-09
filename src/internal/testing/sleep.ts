import type { Deferred } from "../../exports/Deferred.js"
import type { Duration } from "../../exports/Duration.js"
import type { FiberId } from "../../exports/FiberId.js"

/**
 * `Sleep` represents the state of a scheduled effect, including the time the
 * effect is scheduled to run, a promise that can be completed to resume
 * execution of the effect, and the fiber executing the effect.
 *
 * @internal
 */
export interface Sleep {
  readonly duration: Duration
  readonly deferred: Deferred<never, void>
  readonly fiberId: FiberId
}

/** @internal */
export const make = (
  duration: Duration,
  deferred: Deferred<never, void>,
  fiberId: FiberId
): Sleep => ({
  duration,
  deferred,
  fiberId
})
