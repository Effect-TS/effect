/**
 * @since 1.0.0
 */
import * as RateLimiter from "@effect/experimental/RateLimiter"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import * as Activity from "./Activity.js"
import * as DurableClock from "./DurableClock.js"

/**
 * @since 1.0.0
 * @category Accessors
 */
export const rateLimit = (options: {
  readonly name: string
  readonly algorithm?: "fixed-window" | "token-bucket" | undefined
  readonly window: Duration.DurationInput
  readonly limit: number
  readonly key: string
  readonly tokens?: number | undefined
}): Activity.Activity<
  typeof Schema.Void,
  typeof RateLimiter.RateLimitStoreError,
  RateLimiter.RateLimiter
> =>
  Activity.make({
    name: `DurableRateLimiter/${options.name}`,
    error: RateLimiter.RateLimitStoreError,
    execute: Effect.gen(function*() {
      const limiter = yield* RateLimiter.RateLimiter
      const result = yield* limiter.consume({
        onExceeded: "delay",
        ...options
      }).pipe(
        Effect.catchIf((e) => e.reason === "Exceeded", Effect.die)
      )
      return yield* DurableClock.sleep({
        name: `DurableRateLimiter/${options.name}`,
        duration: result.delay
      })
    })
  })
