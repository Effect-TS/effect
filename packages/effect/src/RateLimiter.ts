/**
 * Limits the number of calls to a resource to a maximum amount in some interval using the token bucket algorithm.
 *
 * Note that only the moment of starting the effect is rate limited: the number of concurrent executions is not bounded.
 *
 * Calls are queued up in an unbounded queue until capacity becomes available.
 *
 * @since 2.0.0
 */
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
 *
 * @since 2.0.0
 * @category models
 */
export interface RateLimiter {
  <A, E, R>(task: Effect<A, E, R>): Effect<A, E, R>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (limit: number, window: DurationInput) => Effect<
  RateLimiter,
  never,
  Scope
> = internal.make
