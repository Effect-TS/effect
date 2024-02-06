import type { DurationInput } from "./Duration.js"
import type { Effect } from "./Effect.js"
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
  <R, E, A>(task: Effect<A, E, R>): Effect<A, E, R>
}

export const make = (limit: number, window: DurationInput): Effect<RateLimiter, never, Scope> =>
  internal.make(limit, window)
