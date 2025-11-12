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
 * @since 1ode.0.0
 * @category Constructors
 */
export const make = Effect.gen(function*() {
  const store = yield* RateLimiterStore

  return identity<RateLimiter>({
    [TypeId]: TypeId,
    consume(options) {
      const tokens = options.tokens ?? 1
      const onExceeded = options.onExceeded ?? "fail"
      const algorithm = options.algorithm ?? "fixed-window"
      const window = Duration.decode(options.window)
      const refillRate = Duration.unsafeDivide(window, options.limit)

      if (algorithm === "fixed-window") {
        return Effect.flatMap(
          store.fixedWindow({
            key: options.key,
            tokens,
            refillRate,
            limit: onExceeded === "fail" ? options.limit : undefined
          }),
          ([count, ttl]) => {
            const delay = count <= options.limit ?
              Duration.zero :
              Duration.times(window, Math.ceil(count / options.limit) - 2).pipe(
                Duration.sum(ttl)
              )
            const remaining = options.limit - count
            return Effect.succeed<ConsumeResult>({
              delay,
              limit: options.limit,
              remaining,
              resetIn: delay
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
        (remaining) =>
          Effect.succeed<ConsumeResult>({
            delay: remaining >= 0 ? Duration.zero : Duration.times(refillRate, -remaining),
            limit: options.limit,
            remaining,
            resetIn: Duration.times(refillRate, options.limit - remaining)
          })
      )
    }
  })
})

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
export type RateLimiterError = RateLimitExceeded

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
 * @category Models
 */
export interface ConsumeResult {
  /**
   * The amount of delay to wait before making the next request.
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
   * The time until the rate limit resets.
   */
  readonly resetIn: Duration.Duration
}

/**
 * @since 1.0.0
 * @category RateLimiterStore
 */
export class RateLimiterStore extends Context.Tag("@effect/experimental/RateLimiter/RateLimiterStore")<
  RateLimiterStore,
  {
    /**
     * Returns the current taken tokens and time to live for the `key`.
     *
     * If `limit` is provided, the number of taken tokens will be capped at the
     * limit.
     */
    readonly fixedWindow: (options: {
      readonly key: string
      readonly tokens: number
      readonly refillRate: Duration.Duration
      readonly limit: number | undefined
    }) => Effect.Effect<readonly [count: number, ttl: Duration.Duration], RateLimiterError>

    /**
     * Returns the current remaining tokens for the `key` after consuming the
     * specified amount of tokens.
     *
     * If `allowOverflow` is true, the number of tokens can drop below zero.
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
export const layerStoreMemory = Layer.sync(RateLimiterStore, () => {
  const fixedCounters = new Map<string, { count: number; expiresAt: number }>()
  const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>()

  return RateLimiterStore.of({
    fixedWindow: (options) =>
      Effect.clockWith((clock) => {
        const refillRateMillis = Duration.toMillis(options.refillRate)
        const now = clock.unsafeCurrentTimeMillis()
        let counter = fixedCounters.get(options.key)
        if (!counter || counter.expiresAt <= now) {
          counter = { count: 0, expiresAt: now }
          fixedCounters.set(options.key, counter)
        }
        if (options.limit && counter.count + options.tokens > options.limit) {
          return Effect.fail(
            new RateLimitExceeded({
              key: options.key,
              retryAfter: Duration.millis(counter.expiresAt - now),
              limit: options.limit,
              remaining: options.limit - counter.count
            })
          )
        }
        counter.count += options.tokens
        counter.expiresAt += refillRateMillis * options.tokens
        return Effect.succeed([counter.count, Duration.millis(counter.expiresAt - now)] as const)
      }),
    tokenBucket: (options) =>
      Effect.clockWith((clock) =>
        Effect.suspend(() => {
          const refillRateMillis = Duration.toMillis(options.refillRate)
          const now = clock.unsafeCurrentTimeMillis()
          let bucket = tokenBuckets.get(options.key)
          if (!bucket) {
            bucket = { tokens: options.limit, lastRefill: now }
            tokenBuckets.set(options.key, bucket)
          } else {
            const elapsed = now - bucket.lastRefill
            const tokensToAdd = Math.floor(elapsed / refillRateMillis)
            bucket.tokens = Math.min(options.limit, bucket.tokens + tokensToAdd)
            bucket.lastRefill += tokensToAdd * refillRateMillis
          }

          const newTokenCount = bucket.tokens - options.tokens
          if (!options.allowOverflow && newTokenCount < 0) {
            return Effect.fail(
              new RateLimitExceeded({
                key: options.key,
                retryAfter: Duration.millis(
                  refillRateMillis * (options.tokens - bucket.tokens)
                ),
                limit: options.limit,
                remaining: bucket.tokens
              })
            )
          }
          bucket.tokens = newTokenCount
          return Effect.succeed(bucket.tokens)
        })
      )
  })
})
