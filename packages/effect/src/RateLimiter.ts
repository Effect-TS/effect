/**
 * Limits the number of calls to a resource to a maximum amount in some interval
 * using the token-bucket algorithm.
 *
 * Note that only the moment of starting the effect is rate limited: the number
 * of concurrent executions is not bounded.
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
 * Limits the number of calls to a resource to a maximum amount in some interval
 * using the token-bucket algorithm.
 *
 * Note that only the moment of starting the effect is rate limited: the number
 * of concurrent executions is not bounded.
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
 */
export declare namespace RateLimiter {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Options {
    /**
     * The maximum number of requests that should be allowed.
     */
    readonly limit: number
    /**
     * The interval to utilize for rate-limiting requests. The semantics of the
     * specified `interval` vary depending on the chosen `algorithm`:
     *
     * `token-bucket`: The maximum number of requests will be spread out over
     * the provided interval if no tokens are available.
     *
     * For example, for a `RateLimiter` using the `token-bucket` algorithm with
     * a `limit` of `10` and an `interval` of `1 seconds`, `1` request can be
     * made every `100 millis`.
     *
     * `fixed-window`: The maximum number of requests will be reset during each
     * interval. For example, for a `RateLimiter` using the `fixed-window`
     * algorithm with a `limit` of `10` and an `interval` of `1 seconds`, a
     * maximum of `10` requests can be made each second.
     */
    readonly interval: DurationInput
    /**
     * The algorithm to utilize for rate-limiting requests.
     *
     * Defaults to `token-bucket`.
     */
    readonly algorithm?: "fixed-window" | "token-bucket"
  }
}

/**
 * Constructs a new `RateLimiter` which will utilize the specified algorithm
 * to limit requests (defaults to `token-bucket`).
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: (options: RateLimiter.Options) => Effect<RateLimiter, never, Scope> = internal.make
