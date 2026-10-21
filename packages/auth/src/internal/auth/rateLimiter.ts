import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Digest from "effect/crypto/Digest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as Schema from "effect/Schema"

import { defaultLayer } from "./defaults.ts"

const maximumKeys = 10_000

const storeFailure = (message: string) =>
  Effect.fail(
    RateLimiter.RateLimiterError.make({
      reason: RateLimiter.RateLimitStoreError.make({ message })
    })
  )

// Buckets own only their token state; no per-key Layers or background fibers.
const boundedMemoryStore = (whenFull: "reject" | "evict") =>
  Layer.sync(RateLimiter.RateLimiterStore, () => {
    // Insertion order is recency order: every check moves its key to the end.
    const entries = new Map<string, { tokens: number; lastRefill: number; expiresAt: number }>()

    // A lower bound is enough: refreshed buckets can leave this stale until the
    // next capacity scan, but no expired bucket is ever skipped.
    let earliestExpiry = Infinity
    const unsupported = storeFailure("Auth rate limits support only one-token consumption")

    return RateLimiter.RateLimiterStore.of({
      fixedWindow: () => unsupported,
      adaptiveConsume: () => unsupported,
      adaptiveFeedback: () => unsupported,
      tokenBucket: (request) =>
        Effect.clockWith((clock) =>
          // All reads and writes finish synchronously, so admission is atomic
          // across fibers without allocating a permit or yielding mid-update.
          Effect.suspend(() => {
            if (request.allowOverflow || request.tokens !== 1) return unsupported
            const now = clock.currentTimeMillisUnsafe()
            const refillRateMillis = Duration.toMillis(request.refillRate)
            let entry = entries.get(request.key)

            if (entry === undefined) {
              if (entries.size >= maximumKeys) {
                if (whenFull === "evict") {
                  for (const key of entries.keys()) {
                    entries.delete(key)
                    break
                  }
                } else {
                  if (earliestExpiry <= now) {
                    earliestExpiry = Infinity
                    for (const [key, candidate] of entries) {
                      if (candidate.expiresAt <= now) entries.delete(key)
                      else earliestExpiry = Math.min(earliestExpiry, candidate.expiresAt)
                    }
                  }
                  if (entries.size >= maximumKeys) {
                    return storeFailure("Auth rate limit memory capacity exhausted")
                  }
                }
              }
              entry = { tokens: request.limit, lastRefill: now, expiresAt: 0 }
            } else entries.delete(request.key)
            entries.set(request.key, entry)

            // Keep Effect's memory-store arithmetic, including policy changes
            // and fractional refill intervals. A denied check spends no token.
            const tokensToAdd = Math.floor((now - entry.lastRefill) / refillRateMillis)

            if (tokensToAdd > 0) {
              entry.tokens = Math.min(request.limit, entry.tokens + tokensToAdd)
              entry.lastRefill += tokensToAdd * refillRateMillis
            }
            if (entry.tokens >= request.limit) entry.lastRefill = now
            const remaining = entry.tokens - request.tokens

            if (remaining >= 0) entry.tokens = remaining
            // Preserve the longer idle horizon when policy changes in place.
            entry.expiresAt = Math.max(
              entry.expiresAt,
              now + Math.ceil(refillRateMillis * request.limit)
            )
            earliestExpiry = Math.min(earliestExpiry, entry.expiresAt)

            return Effect.succeed([remaining, Math.max(0, now - entry.lastRefill)] as const)
          })
        )
    })
  })

const Bucket = Schema.fromJsonString(
  Schema.Struct({ tokens: Schema.Finite, lastRefill: Schema.Finite })
)

/** Auth token buckets in any Effect `KeyValueStore`, such as Workers KV or Redis.
 * Each check reads, refills, consumes and writes back one entry. That is not
 * atomic: concurrent checks and replication lag can admit a few extra requests.
 * A read, write or decode failure denies the request. An idle bucket refills to
 * full when next read, so expiry only bounds storage: give entries a TTL at least
 * as long as the longest window. Entries are keyed by a SHA-256 digest of the
 * bucket key, a fixed short length that carries no identifiers. Supports the
 * one-token buckets auth uses.
 */
export const keyValueRateLimiterStore: Layer.Layer<
  RateLimiter.RateLimiterStore,
  never,
  KeyValueStore.KeyValueStore | Digest.Digest
> = Layer.effect(
  RateLimiter.RateLimiterStore,
  Effect.gen(function*() {
    const store = yield* KeyValueStore.KeyValueStore
    const digest = yield* Digest.Digest
    const unsupported = storeFailure("Auth rate limits support only one-token consumption")

    return RateLimiter.RateLimiterStore.of({
      fixedWindow: () => unsupported,
      adaptiveConsume: () => unsupported,
      adaptiveFeedback: () => unsupported,
      tokenBucket: Effect.fnUntraced(
        function*(request) {
          if (request.allowOverflow || request.tokens !== 1) return yield* unsupported
          const refillRateMillis = Duration.toMillis(request.refillRate)
          const now = yield* Clock.currentTimeMillis

          const key = `effect-auth-rate:${
            Base64Url.encode(
              yield* digest.digest(Digest.sha256, new TextEncoder().encode(request.key)).pipe(
                Effect.catchDefect(() => storeFailure("Auth rate limit key digest failed"))
              )
            )
          }`

          const stored = yield* store.get(key)

          const bucket = stored === undefined
            ? { tokens: request.limit, lastRefill: now }
            : { ...(yield* Schema.decodeEffect(Bucket)(stored)) }

          const before = { ...bucket }
          // Same arithmetic as Effect's memory store, persisted between checks.
          const tokensToAdd = Math.floor((now - bucket.lastRefill) / refillRateMillis)

          if (tokensToAdd > 0) {
            bucket.tokens = Math.min(request.limit, bucket.tokens + tokensToAdd)
            bucket.lastRefill += tokensToAdd * refillRateMillis
          }
          if (bucket.tokens >= request.limit) bucket.lastRefill = now
          const remaining = bucket.tokens - request.tokens

          if (remaining >= 0) bucket.tokens = remaining
          // A rejected check on an unchanged bucket writes nothing.
          if (
            stored === undefined ||
            bucket.tokens !== before.tokens ||
            bucket.lastRefill !== before.lastRefill
          ) {
            yield* store.set(key, yield* Schema.encodeEffect(Bucket)(bucket))
          }

          return [remaining, Math.max(0, now - bucket.lastRefill)] as const
        },
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) =>
              error._tag === "RateLimiterError" ? error : RateLimiter.RateLimiterError.make({
                reason: RateLimiter.RateLimitStoreError.make({
                  message: error._tag === "KeyValueStoreError"
                    ? "Auth rate limit key-value store failed"
                    : "Auth rate limit entry is malformed"
                })
              }))
          )
        )
      )
    })
  })
)

/**
 * A process-local `RateLimiter` that a supplied store never replaces. Fleet-wide
 * budgets use it: in a shared store one key per action would take every request's
 * write and let any client exhaust everyone's allowance. Per instance they shed load.
 *
 * @internal
 */
export const localRateLimiter = (whenFull: "reject" | "evict") =>
  RateLimiter.make.pipe(Effect.provide(boundedMemoryStore(whenFull), { local: true }))

/**
 * The default `RateLimiter` for one Auth limiter: a supplied `RateLimiter` or
 * `RateLimiterStore` wins, otherwise process-local token buckets for at most
 * 10,000 keys. When a new key arrives at capacity, `reject` reclaims buckets idle
 * for a whole refill window and otherwise fails; `evict` drops the least recently
 * checked bucket, whose key later restarts with a full allowance. Each call owns
 * separate state; no cleanup fiber runs.
 *
 * @internal
 */
export const boundedMemoryRateLimiter = (whenFull: "reject" | "evict") =>
  defaultLayer(
    RateLimiter.RateLimiter,
    // Not the shared `RateLimiter.layer`: Layers memoize by identity, so two
    // defaults built in one graph would capture whichever store built first.
    Layer.effect(RateLimiter.RateLimiter, RateLimiter.make).pipe(
      Layer.provide(defaultLayer(RateLimiter.RateLimiterStore, boundedMemoryStore(whenFull)))
    )
  )
