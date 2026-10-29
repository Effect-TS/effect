import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import type { AdaptivePhase, RateLimiterStore } from "../persistence/RateLimiter.ts"
import * as Schedule from "../Schedule.ts"
import type * as Scope from "../Scope.ts"

/** @internal */
export const adaptiveStateTtlGraceMillis = 60_000
/** @internal */
export const adaptiveStateMaxWindowMillis = 60 * 60 * 1_000

/** @internal */
export const clampAdaptiveDurationMillis = (millis: number): number => {
  if (Number.isNaN(millis) || millis <= 0) return 1
  return Math.min(millis, adaptiveStateMaxWindowMillis)
}

interface AdaptiveState {
  phase: AdaptivePhase
  epoch: number
  cooldownUntil: number
  learningStartedAt: number
  observedTokens: number
  learnedLimit: number
  learnedWindowMillis: number
  expiresAt: number
}

/**
 * How often the in-memory store removes expired entries.
 *
 * @internal
 */
export const memoryStoreSweepInterval: Duration.Duration = Duration.minutes(1)

/**
 * Creates a process-local `RateLimiterStore`. Every entry expires once its
 * state is indistinguishable from a missing key, and a background sweep tied to
 * the scope removes expired entries, so an idle store drains to empty.
 *
 * @internal
 */
export const makeMemoryStore: Effect.Effect<
  {
    readonly store: RateLimiterStore["Service"]
    readonly size: number
  },
  never,
  Scope.Scope
> = Effect.gen(function*() {
  const fixedCounters = new Map<string, { count: number; expiresAt: number }>()
  const tokenBuckets = new Map<string, { tokens: number; lastRefill: number; expiresAt: number }>()
  const adaptiveStates = new Map<string, AdaptiveState>()

  const getAdaptiveState = (key: string, now: number): AdaptiveState | undefined => {
    const state = adaptiveStates.get(key)
    if (!state) return undefined
    if (state.expiresAt <= now) {
      adaptiveStates.delete(key)
      return undefined
    }
    return state
  }

  const cooldownExpiresAt = (cooldownUntil: number): number => cooldownUntil + adaptiveStateTtlGraceMillis

  const learningExpiresAt = (now: number, fallbackWindow: Duration.Duration): number =>
    now + Duration.toMillis(fallbackWindow) + adaptiveStateTtlGraceMillis

  const learnedExpiresAt = (now: number, learnedWindowMillis: number): number =>
    now + learnedWindowMillis + adaptiveStateTtlGraceMillis

  const store: RateLimiterStore["Service"] = {
    fixedWindow: (options) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const refillRateMillis = Duration.toMillis(options.refillRate)
          const now = clock.currentTimeMillisUnsafe()
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
          const now = clock.currentTimeMillisUnsafe()
          let bucket = tokenBuckets.get(options.key)
          if (!bucket || bucket.expiresAt <= now) {
            bucket = { tokens: options.limit, lastRefill: now, expiresAt: now }
            tokenBuckets.set(options.key, bucket)
          }
          const tokensToAdd = Math.floor((now - bucket.lastRefill) / refillRateMillis)
          if (tokensToAdd > 0) {
            bucket.tokens = Math.min(options.limit, bucket.tokens + tokensToAdd)
            bucket.lastRefill += tokensToAdd * refillRateMillis
          }
          if (bucket.tokens >= options.limit) {
            bucket.lastRefill = now
          }

          const newTokenCount = bucket.tokens - options.tokens
          if (options.allowOverflow || newTokenCount >= 0) {
            bucket.tokens = newTokenCount
          }
          // The bucket is indistinguishable from a fresh one once fully refilled
          bucket.expiresAt = bucket.lastRefill + Math.ceil(options.limit - bucket.tokens) * refillRateMillis
          return [newTokenCount, Math.max(0, now - bucket.lastRefill)] as const
        })
      ),
    adaptiveConsume: (options) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const now = clock.currentTimeMillisUnsafe()
          const state = getAdaptiveState(options.key, now)
          if (!state) {
            return {
              delay: Duration.zero,
              epoch: 0,
              phase: "inactive"
            }
          }

          if (state.phase === "cooldown") {
            if (state.cooldownUntil > now) {
              return {
                delay: Duration.millis(state.cooldownUntil - now),
                epoch: state.epoch,
                phase: "cooldown"
              }
            }

            state.phase = "learning"
            state.epoch += 1
            state.learningStartedAt = now
            state.observedTokens = options.tokens
            state.expiresAt = learningExpiresAt(now, options.fallbackWindow)
            return {
              delay: Duration.zero,
              epoch: state.epoch,
              phase: "learning"
            }
          }

          if (state.phase === "learning") {
            state.observedTokens += options.tokens
            return {
              delay: Duration.zero,
              epoch: state.epoch,
              phase: state.phase
            }
          }

          if (state.phase === "learned") {
            const refillRateMillis = state.learnedWindowMillis / state.learnedLimit
            if (state.cooldownUntil <= now) {
              state.observedTokens = 0
              state.cooldownUntil = now
            }
            state.observedTokens += options.tokens
            state.cooldownUntil += refillRateMillis * options.tokens

            const ttl = state.cooldownUntil - now
            const ttlTotal = state.observedTokens * refillRateMillis
            const elapsed = ttlTotal - ttl
            const windowNumber = Math.floor((state.observedTokens - 1) / state.learnedLimit)
            const remaining = (windowNumber * state.learnedWindowMillis) - elapsed

            return {
              delay: remaining <= 0 ? Duration.zero : Duration.millis(remaining),
              epoch: state.epoch,
              phase: state.phase
            }
          }

          return {
            delay: Duration.zero,
            epoch: state.epoch,
            phase: state.phase
          }
        })
      ),
    adaptiveFeedback: (options) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          if (options.status !== 429 || options.retryAfter === undefined) return

          const retryAfterMillis = clampAdaptiveDurationMillis(Duration.toMillis(options.retryAfter))

          const now = clock.currentTimeMillisUnsafe()
          const cooldownUntil = now + retryAfterMillis
          const state = getAdaptiveState(options.key, now)
          if (!state) {
            if (options.epoch !== 0) return
            adaptiveStates.set(options.key, {
              phase: "cooldown",
              epoch: 0,
              cooldownUntil,
              learningStartedAt: 0,
              observedTokens: 0,
              learnedLimit: 0,
              learnedWindowMillis: 0,
              expiresAt: cooldownExpiresAt(cooldownUntil)
            })
            return
          }

          if (state.epoch !== options.epoch) return

          if (state.phase === "cooldown") {
            state.cooldownUntil = Math.max(state.cooldownUntil, cooldownUntil)
            state.expiresAt = cooldownExpiresAt(state.cooldownUntil)
            return
          }

          if (state.phase === "learning") {
            const acceptedTokens = state.observedTokens - options.tokens
            if (acceptedTokens <= 0) {
              state.phase = "cooldown"
              state.cooldownUntil = cooldownUntil
              state.learningStartedAt = 0
              state.observedTokens = 0
              state.learnedLimit = 0
              state.learnedWindowMillis = 0
              state.expiresAt = cooldownExpiresAt(cooldownUntil)
              return
            }

            const learnedWindowMillis = clampAdaptiveDurationMillis((now - state.learningStartedAt) + retryAfterMillis)
            state.phase = "learned"
            state.epoch += 1
            state.cooldownUntil = state.learningStartedAt + learnedWindowMillis
            state.observedTokens = acceptedTokens
            state.learnedLimit = acceptedTokens
            state.learnedWindowMillis = learnedWindowMillis
            state.expiresAt = learnedExpiresAt(now, learnedWindowMillis)
            return
          }

          if (state.phase === "learned") {
            state.phase = "cooldown"
            state.cooldownUntil = cooldownUntil
            state.learningStartedAt = 0
            state.observedTokens = 0
            state.learnedLimit = 0
            state.learnedWindowMillis = 0
            state.expiresAt = cooldownExpiresAt(cooldownUntil)
          }
        })
      )
  }

  const sweep = Effect.clockWith((clock) =>
    Effect.sync(() => {
      const now = clock.currentTimeMillisUnsafe()
      for (const map of [fixedCounters, tokenBuckets, adaptiveStates]) {
        for (const [key, entry] of map) {
          if (entry.expiresAt <= now) {
            map.delete(key)
          }
        }
      }
    })
  )
  yield* sweep.pipe(
    Effect.repeat(Schedule.spaced(memoryStoreSweepInterval)),
    Effect.forkScoped
  )

  return {
    store,
    get size() {
      return fixedCounters.size + tokenBuckets.size + adaptiveStates.size
    }
  }
})
