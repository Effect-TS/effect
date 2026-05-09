/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
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

  readonly consume: (options: {
    readonly algorithm?: "fixed-window" | "token-bucket" | undefined
    readonly onExceeded?: "delay" | "fail" | undefined
    readonly window: Duration.DurationInput
    readonly limit: number
    readonly key: string
    readonly tokens?: number | undefined
  }) => Effect.Effect<ConsumeResult, RateLimiterError>
}

/**
 * @since 1.0.0
 * @category Tags
 */
export const RateLimiter: Context.Tag<RateLimiter, RateLimiter> = Context.GenericTag<RateLimiter>(TypeId)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: Effect.Effect<
  RateLimiter,
  never,
  RateLimiterStore
> = Effect.gen(function*() {
  const store = yield* RateLimiterStore

  return identity<RateLimiter>({
    [TypeId]: TypeId,
    consume(options) {
      const tokens = options.tokens ?? 1
      const onExceeded = options.onExceeded ?? "fail"
      const algorithm = options.algorithm ?? "fixed-window"
      const window = Duration.decode(options.window)
      const windowMillis = Duration.toMillis(window)
      const refillRate = Duration.unsafeDivide(window, options.limit)
      const refillRateMillis = Duration.toMillis(refillRate)

      if (tokens > options.limit) {
        return onExceeded === "fail"
          ? Effect.fail(
            new RateLimitExceeded({
              key: options.key,
              retryAfter: window,
              limit: options.limit,
              remaining: 0
            })
          )
          : Effect.succeed<ConsumeResult>({
            delay: window,
            limit: options.limit,
            remaining: 0,
            resetAfter: window
          })
      }

      if (algorithm === "fixed-window") {
        return Effect.flatMap(
          store.fixedWindow({
            key: options.key,
            tokens,
            refillRate,
            limit: onExceeded === "fail" ? options.limit : undefined
          }),
          ([count, ttl]) => {
            if (onExceeded === "fail") {
              const remaining = options.limit - count
              if (remaining < 0) {
                return Effect.fail(
                  new RateLimitExceeded({
                    key: options.key,
                    retryAfter: Duration.millis(ttl),
                    limit: options.limit,
                    remaining: 0
                  })
                )
              }
              return Effect.succeed<ConsumeResult>({
                delay: Duration.zero,
                limit: options.limit,
                remaining,
                resetAfter: Duration.millis(ttl)
              })
            }
            const ttlTotal = count * refillRateMillis
            const elapsed = ttlTotal - ttl
            const windowNumber = Math.floor((count - 1) / options.limit)
            const remaining = (windowNumber * windowMillis) - elapsed
            const delay = remaining <= 0 ? Duration.zero : Duration.millis(remaining)
            return Effect.succeed<ConsumeResult>({
              delay,
              limit: options.limit,
              remaining: options.limit - count,
              resetAfter: Duration.times(window, Math.ceil(ttl / windowMillis))
            })
          }
        )
      }

      return Effect.flatMap(
        store.tokenBucket({
          key: options.key,
          tokens,
          limit: options.limit,
          refillRate,
          allowOverflow: onExceeded === "delay"
        }),
        (remaining) => {
          if (onExceeded === "fail") {
            if (remaining < 0) {
              return Effect.fail(
                new RateLimitExceeded({
                  key: options.key,
                  retryAfter: Duration.times(refillRate, -remaining),
                  limit: options.limit,
                  remaining: 0
                })
              )
            }
            return Effect.succeed<ConsumeResult>({
              delay: Duration.zero,
              limit: options.limit,
              remaining,
              resetAfter: Duration.times(refillRate, options.limit - remaining)
            })
          }
          if (remaining >= 0) {
            return Effect.succeed<ConsumeResult>({
              delay: Duration.zero,
              limit: options.limit,
              remaining,
              resetAfter: Duration.times(refillRate, options.limit - remaining)
            })
          }
          return Effect.succeed<ConsumeResult>({
            delay: Duration.times(refillRate, -remaining),
            limit: options.limit,
            remaining,
            resetAfter: Duration.times(refillRate, options.limit - remaining)
          })
        }
      )
    }
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  RateLimiter,
  never,
  RateLimiterStore
> = Layer.effect(RateLimiter, make)

/**
 * Access a function that applies rate limiting to an effect.
 *
 * ```ts
 * import { RateLimiter } from "@effect/experimental"
 * import { Effect } from "effect"
 *
 * Effect.gen(function*() {
 *   // Access the `withLimiter` function from the RateLimiter module
 *   const withLimiter = yield* RateLimiter.makeWithRateLimiter
 *
 *   // Apply a rate limiter to an effect
 *   yield* Effect.log("Making a request with rate limiting").pipe(
 *     withLimiter({
 *       key: "some-key",
 *       limit: 10,
 *       onExceeded: "delay",
 *       window: "5 seconds",
 *       algorithm: "fixed-window"
 *     })
 *   )
 * })
 * ```
 *
 * @since 1.0.0
 * @category Accessors
 */
export const makeWithRateLimiter: Effect.Effect<
  ((options: {
    readonly algorithm?: "fixed-window" | "token-bucket" | undefined
    readonly onExceeded?: "delay" | "fail" | undefined
    readonly window: Duration.DurationInput
    readonly limit: number
    readonly key: string
    readonly tokens?: number | undefined
  }) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | RateLimiterError, R>),
  never,
  RateLimiter
> = Effect.map(
  RateLimiter,
  (limiter) => (options) => (effect) =>
    Effect.flatMap(limiter.consume(options), ({ delay }) => {
      if (Duration.isZero(delay)) return effect
      return Effect.delay(effect, delay)
    })
)

/**
 * Access a function that sleeps when the rate limit is exceeded.
 *
 * ```ts
 * import { RateLimiter } from "@effect/experimental"
 * import { Effect } from "effect"
 *
 * export default Effect.gen(function*() {
 *   // Access the `sleep` function from the RateLimiter module
 *   const sleep = yield* RateLimiter.makeSleep
 *
 *   // Use the `sleep` function with specific rate limiting parameters.
 *   // This will only sleep if the rate limit has been exceeded.
 *   yield* sleep({
 *     key: "some-key",
 *     limit: 10,
 *     window: "5 seconds",
 *     algorithm: "fixed-window"
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category Accessors
 */
export const makeSleep: Effect.Effect<
  ((options: {
    readonly algorithm?: "fixed-window" | "token-bucket" | undefined
    readonly window: Duration.DurationInput
    readonly limit: number
    readonly key: string
    readonly tokens?: number | undefined
  }) => Effect.Effect<ConsumeResult, RateLimitStoreError>),
  never,
  RateLimiter
> = Effect.map(
  RateLimiter,
  (limiter) => (options) =>
    Effect.flatMap(
      limiter.consume({
        ...options,
        onExceeded: "delay"
      }) as Effect.Effect<ConsumeResult, RateLimitStoreError>,
      (result) => {
        if (Duration.isZero(result.delay)) return Effect.succeed(result)
        return Effect.as(Effect.sleep(result.delay), result)
      }
    )
)

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
export class RateLimitExceeded extends Schema.TaggedError<RateLimitExceeded>(
  "@effect/experimental/RateLimiter/RateLimitExceeded"
)("RateLimiterError", {
  retryAfter: Schema.DurationFromMillis,
  key: Schema.String,
  limit: Schema.Number,
  remaining: Schema.Number
}) {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

  /**
   * @since 1.0.0
   */
  readonly reason = "Exceeded"

  /**
   * @since 1.0.0
   */
  get message(): string {
    return `Rate limit exceeded`
  }
}

/**
 * @since 1.0.0
 * @category Errors
 */
export class RateLimitStoreError extends Schema.TaggedError<RateLimitStoreError>(
  "@effect/experimental/RateLimiter/RateLimitStoreError"
)("RateLimiterError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

  /**
   * @since 1.0.0
   */
  readonly reason = "StoreError"
}

/**
 * @since 1.0.0
 * @category Errors
 */
export const RateLimiterError = Schema.Union(RateLimitExceeded, RateLimitStoreError)

/**
 * @since 1.0.0
 * @category Errors
 */
export type RateLimiterError = RateLimitExceeded | RateLimitStoreError

/**
 * @since 1.0.0
 * @category Models
 */
export interface ConsumeResult {
  /**
   * The amount of delay to wait before making the next request, when the rate
   * limiter is using the "delay" `onExceeded` strategy.
   *
   * It will be Duration.zero if the request is allowed immediately.
   */
  readonly delay: Duration.Duration

  /**
   * The maximum number of requests allowed in the current window.
   */
  readonly limit: number

  /**
   * The number of remaining requests in the current window.
   */
  readonly remaining: number

  /**
   * The time until the rate limit fully resets.
   */
  readonly resetAfter: Duration.Duration
}

/**
 * @since 1.0.0
 * @category RateLimiterStore
 */
export class RateLimiterStore extends Context.Tag("@effect/experimental/RateLimiter/RateLimiterStore")<
  RateLimiterStore,
  {
    /**
     * Returns the token count *after* taking the specified `tokens` and time to
     * live for the `key`.
     *
     * If `limit` is provided, the number of taken tokens will be capped at the
     * limit.
     *
     * In the case the limit is exceeded, the returned count will be greater
     * than the limit, but the TTL will not be updated.
     */
    readonly fixedWindow: (options: {
      readonly key: string
      readonly tokens: number
      readonly refillRate: Duration.Duration
      readonly limit: number | undefined
    }) => Effect.Effect<readonly [count: number, ttl: number], RateLimiterError>

    /**
     * Returns the current remaining tokens for the `key` after consuming the
     * specified amount of tokens.
     *
     * If `allowOverflow` is true, the number of tokens can drop below zero.
     *
     * In the case of no overflow, the returned token count will only be
     * negative if the requested tokens exceed the available tokens, but the
     * real token count will not be persisted below zero.
     */
    readonly tokenBucket: (options: {
      readonly key: string
      readonly tokens: number
      readonly limit: number
      readonly refillRate: Duration.Duration
      readonly allowOverflow: boolean
    }) => Effect.Effect<number, RateLimiterError>
  }
>() {}

/**
 * @since 1.0.0
 * @category RateLimiterStore
 */
export const layerStoreMemory: Layer.Layer<
  RateLimiterStore
> = Layer.sync(RateLimiterStore, () => {
  const fixedCounters = new Map<string, { count: number; expiresAt: number }>()
  const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>()

  return RateLimiterStore.of({
    fixedWindow: (options) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const refillRateMillis = Duration.toMillis(options.refillRate)
          const now = clock.unsafeCurrentTimeMillis()
          let counter = fixedCounters.get(options.key)
          if (!counter || counter.expiresAt <= now) {
            counter = { count: 0, expiresAt: now }
            fixedCounters.set(options.key, counter)
          }
          if (options.limit && counter.count + options.tokens > options.limit) {
            return [counter.count + options.tokens, counter.expiresAt - now] as const
          }
          counter.count += options.tokens
          counter.expiresAt += refillRateMillis * options.tokens
          return [counter.count, counter.expiresAt - now] as const
        })
      ),
    tokenBucket: (options) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const refillRateMillis = Duration.toMillis(options.refillRate)
          const now = clock.unsafeCurrentTimeMillis()
          let bucket = tokenBuckets.get(options.key)
          if (!bucket) {
            bucket = { tokens: options.limit, lastRefill: now }
            tokenBuckets.set(options.key, bucket)
          } else {
            const elapsed = now - bucket.lastRefill
            const tokensToAdd = Math.floor(elapsed / refillRateMillis)
            if (tokensToAdd > 0) {
              bucket.tokens = Math.min(options.limit, bucket.tokens + tokensToAdd)
              bucket.lastRefill += tokensToAdd * refillRateMillis
            }
          }

          const newTokenCount = bucket.tokens - options.tokens
          if (options.allowOverflow || newTokenCount >= 0) {
            bucket.tokens = newTokenCount
          }
          return newTokenCount
        })
      )
  })
})
