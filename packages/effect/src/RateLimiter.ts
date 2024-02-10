/**
 * Limits the number of calls to a resource to a maximum amount in some interval.
 *
 * @since 2.0.0
 */
import type { DurationInput } from "./Duration.js"
import type { Effect } from "./Effect.js"
import * as internal from "./internal/rateLimiter.js"
import type { Scope } from "./Scope.js"

/**
 * Limits the number of calls to a resource to a maximum amount in some interval.
 *
 * Note that only the moment of starting the effect is rate limited: the number
 * of concurrent executions is not bounded.
 *
 * @since 2.0.0
 * @category models
 */
export interface RateLimiter {
  <A, E, R>(task: Effect<A, E, R>): Effect<A, E, R>
}

/**
 * Constructs a new `RateLimiter` which will utilize the token-bucket algorithm
 * to limit requests. The specified number of `tokens` is immediately available
 * after constructing the `RateLimiter`.
 *
 * **NOTE**: The maximum number of requests (specified by `tokens`) will be
 * spread out over the provided `interval`. For example, creating a `RateLimiter`
 * with `10` `tokens` and an `interval` of `1 seconds` will mean that `1` request
 * can be made every `100 millis` if no tokens are available.
 *
 * Notes
 * - Only the moment of starting the effect is rate limited. The number of concurrent executions is not bounded.
 * - Instances of `RateLimiter` can be composed.
 * - The "cost" per effect can be changed. See {@link withCost}
 *
 * @example
 * import { Effect, RateLimiter } from "effect";
 * import { compose } from "effect/Function"
 *
 * const program = Effect.scoped(
 *   Effect.gen(function* ($) {
 *     const perMinuteRL = yield* $(RateLimiter.make(30, "1 minutes"))
 *     const perSecondRL = yield* $(RateLimiter.make(2, "1 seconds"))
 *
 *     // This rate limiter respects both the 30 calls per minute
 *     // and the 2 calls per second constraints.
 *      const rateLimit = compose(perMinuteRL, perSecondRL)
 *
 *     // simulate repeated calls
 *     for (let n = 0; n < 100; n++) {
 *       // wrap the effect we want to limit with rateLimit
 *       yield* $(rateLimit(Effect.log("Calling RateLimited Effect")));
 *     }
 *   })
 * );
 *
 * @since 2.0.0
 * @category constructors
 */
export const tokenBucket: (tokens: number, interval: DurationInput) => Effect<
  RateLimiter,
  never,
  Scope
> = internal.tokenBucket

/**
 * Constructs a new `RateLimiter` which will utilize the fixed-window algorithm
 * to limit requests. The specified request `limit` is immediately available
 * after constructing the `RateLimiter`.
 *
 * **NOTE**: The maximum number of requests (specified by `limit`) will be
 * allowed in each `window`. After the `window` has elapsed, the `limit` is
 * reset.
 *
 * @param limit The maximum number of requests to allow.
 * @param window The window of time to wait before resetting the limit.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fixedWindow: (limit: number, window: DurationInput) => Effect<RateLimiter, never, Scope> =
  internal.fixedWindow

/**
 * Alters the per-effect cost of the rate-limiter.
 *
 * This can be used for "credit" based rate-limiting where different API endpoints
 * cost a different number of credits within a time window.
 * Eg: 1000 credits / hour, where a query costs 1 credit and a mutation costs 5 credits.
 *
 * @example
 * import { Effect, RateLimiter } from "effect";
 * import { compose } from "effect/Function";
 *
 * const program = Effect.scoped(
 *   Effect.gen(function* ($) {
 *     // Create a rate limiter that has an hourly limit of 1000 credits
 *     const rateLimiter = yield* $(RateLimiter.make(1000, "1 hours"));
 *     // Query API costs 1 credit per call ( 1 is the default cost )
 *     const queryAPIRL = compose(rateLimiter, RateLimiter.withCost(1));
 *     // Mutation API costs 5 credits per call
 *     const mutationAPIRL = compose(rateLimiter, RateLimiter.withCost(5));

 *     // Use the pre-defined rate limiters
 *     yield* $(queryAPIRL(Effect.log("Sample Query")));
 *     yield* $(mutationAPIRL(Effect.log("Sample Mutation")));
 *
 *     // Or set a cost on-the-fly
 *     yield* $(
 *       rateLimiter(Effect.log("Another query with a different cost")).pipe(
 *         RateLimiter.withCost(3)
 *       )
 *     );
 *   })
 * );
 *
 * @since 2.0.0
 * @category combinators
 */
export const withCost: (cost: number) => <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R> = internal.withCost
