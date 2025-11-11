/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export const TypeId: TypeId = "~@effect/experimental/RateLimiter"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export type TypeId = "~@effect/experimental/RateLimiter"

/**
 * @since 1.0.0
 * @category Models
 */
export interface RateLimiter {
  readonly [TypeId]: TypeId

  consume(this: RateLimiter, options: {
    readonly algorithm: "fixed-window" | "token-bucket"
    readonly window: Duration.DurationInput
    readonly limit: number
    readonly key: string
    readonly tokens?: number | undefined
    readonly mode?: "wait" | "fail" | undefined
  }): Effect.Effect<ConsumeResult, RateLimiterError>
}

/**
 * @since 1.0.0
 * @category Errors
 */
export const ErrorTypeId: ErrorTypeId = "~@effect/experimental/RateLimiter/RateLimiterError"

/**
 * @since 1.0.0
 * @category Errors
 */
export type ErrorTypeId = "~@effect/experimental/RateLimiter/RateLimiterError"

/**
 * @since 1.0.0
 * @category Errors
 */
export class RateLimiterError extends Schema.TaggedError<RateLimiterError>(
  "@effect/experimental/RateLimiter/RateLimiterError"
)("RateLimiterError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ConsumeResult {
  /**
   * The amount of delay to wait before making the next request.
   *
   * It will be Duration.zero if the request is allowed immediately.
   */
  readonly delay: Duration.Duration
}

/**
 * @since 1.0.0
 * @category RateLimiterStore
 */
export class RateLimiterStore extends Context.Tag("@effect/experimental/RateLimiter/RateLimiterStore")<
  RateLimiterStore,
  {
    readonly fixedWindowWait: (options: {
      readonly key: string
      readonly window: Duration.Duration
      readonly limit: number
      readonly tokens: number
    }) => Effect.Effect<
      readonly [count: number, startMillis: number],
      RateLimiterError
    >
  }
>() {}
