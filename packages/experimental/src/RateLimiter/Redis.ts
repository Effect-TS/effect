/**
 * @since 1.0.0
 */
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { RedisOptions } from "ioredis"
import { Redis } from "ioredis"
import * as RateLimiter from "../RateLimiter.js"

interface RedisWithRateLimiting extends Redis {
  fixedWindow(key: string, tokens: number, refillMillis: number, limit?: number): Promise<[number, number]>
  tokenBucket(
    key: string,
    tokens: number,
    refillMillis: number,
    limit: number,
    now: number,
    overflow: 0 | 1
  ): Promise<number>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(
  options: RedisOptions & {
    readonly prefix?: string | undefined
  }
) {
  const prefix = options.prefix ?? "ratelimiter:"
  const redis = yield* Effect.acquireRelease(
    Effect.sync(() => new Redis(options) as RedisWithRateLimiting),
    (redis) => Effect.promise(() => redis.quit())
  )

  redis.defineCommand("fixedWindow", {
    lua: `
local key = KEYS[1]
local tokens = tonumber(ARGV[1])
local refillms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local current = tonumber(redis.call("GET", key))

if not current then
  local nextpttl = refillms * tokens
  redis.call("SET", key, tokens, "PX", nextpttl)
  return { tokens, nextpttl }
end

local currentpttl = tonumber(redis.call("PTTL", key) or "0")
local next = current + tokens
if limit and next > limit then
  return { next, currentpttl }
end

local nextpttl = currentpttl + (refillms * tokens)
redis.call("SET", key, next, "PX", nextpttl)
return { next, nextpttl }
`,
    numberOfKeys: 1,
    readOnly: false
  })

  redis.defineCommand("tokenBucket", {
    lua: `
local key = KEYS[1]
local last_refill_key = key .. ":refill"
local tokens = tonumber(ARGV[1])
local refill_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local overflow = ARGV[5] == "1"
local current = tonumber(redis.call("GET", key))
local last_refill = tonumber(redis.call("GET", last_refill_key))

if not current then
  current = limit
  last_refill = now
  redis.call("SET", key, current)
  redis.call("SET", last_refill_key, last_refill)
end

local elapsed = now - last_refill
local refill_amount = math.floor(elapsed / refill_ms)
if refill_amount > 0 then
  current = math.min(current + refill_amount, limit)
  last_refill = last_refill + (refill_amount * refill_ms)
  redis.call("SET", last_refill_key, last_refill)
end

local next = current - tokens
if next < 0 and not overflow then
  redis.call("SET", key, current)
  return next
end

redis.call("SET", key, next)
return next
`,
    numberOfKeys: 1,
    readOnly: false
  })

  return RateLimiter.RateLimiterStore.of({
    fixedWindow(options) {
      const key = `${prefix}${options.key}`
      const refillMillis = Duration.toMillis(options.refillRate)
      return Effect.tryPromise({
        try: () => redis.fixedWindow(key, options.tokens, refillMillis, options.limit),
        catch: (cause) =>
          new RateLimiter.RateLimitStoreError({
            message: `Failed to execute fixedWindow rate limiting command`,
            cause
          })
      })
    },
    tokenBucket(options) {
      const key = `${prefix}${options.key}`
      const refillMillis = Duration.toMillis(options.refillRate)
      return Effect.clockWith((clock) =>
        Effect.tryPromise({
          try: () =>
            redis.tokenBucket(
              key,
              options.tokens,
              refillMillis,
              options.limit,
              clock.unsafeCurrentTimeMillis(),
              options.allowOverflow ? 1 : 0
            ),
          catch: (cause) =>
            new RateLimiter.RateLimitStoreError({
              message: `Failed to execute tokenBucket rate limiting command`,
              cause
            })
        })
      )
    }
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStore = (options: RedisOptions & { readonly prefix?: string | undefined }) =>
  Layer.scoped(RateLimiter.RateLimiterStore, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStoreConfig = (
  options: Config.Config.Wrap<RedisOptions & { readonly prefix?: string | undefined }>
) => Layer.scoped(RateLimiter.RateLimiterStore, Effect.flatMap(Config.unwrap(options), make))
