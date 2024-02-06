import type { Effect } from "./Effect.js"
import type { Duration } from "./index.js"
import * as internal from "./internal/rateLimiter.js"
import type { Scope } from "./Scope.js"

/**
 * Limits the number of calls to a resource to a maximum amount in some interval using the token bucket algorithm.
 *
 * Note that only the moment of starting the effect is rate limited: the number of concurrent executions is not bounded.
 *
 * Calls are queued up in an unbounded queue until capacity becomes available.
 */
export interface RateLimiter {
  <R, E, A>(task: Effect<R, E, A>): Effect<R, E, A>
}

export const make = (max: number, interval: Duration.DurationInput): Effect<Scope, never, RateLimiter> =>
  internal.make(max, interval)
