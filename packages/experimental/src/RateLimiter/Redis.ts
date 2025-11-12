/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { RedisOptions } from "ioredis"
import { Redis } from "ioredis"
import * as RateLimiter from "../RateLimiter.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.fnUntraced(function*(options: RedisOptions) {
  const redis = yield* Effect.acquireRelease(
    Effect.sync(() => new Redis(options)),
    (redis) => Effect.promise(() => redis.quit())
  )

  redis.defineCommand("fixedWindow", {
    lua: `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
`,
    numberOfKeys: 4,
    readOnly: false
  })

  redis.defineCommand("tokenBucket", {
    lua: `

`,
    numberOfKeys: 5,
    readOnly: false
  })

  return RateLimiter.RateLimiterStore.of({
    fixedWindow: Effect.fnUntraced(function*(options) {}),
    tokenBucket: Effect.fnUntraced(function*(options) {})
  })
})
