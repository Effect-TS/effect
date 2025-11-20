import { RateLimiter } from "@effect/experimental"
import * as RedisRateLimiter from "@effect/experimental/RateLimiter/Redis"
import { NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"

// create a RateLimiter layer using Redis as the backing store.
//
// You can also use RateLimiter.layerStoreMemory for an in-memory store.
const RateLimiterLayer = RateLimiter.layer.pipe(
  Layer.provide(RedisRateLimiter.layerStore({
    host: "localhost",
    port: 6379
  }))
)

Effect.gen(function*() {
  const limiter = yield* RateLimiter.RateLimiter

  // the `consume` effect will attempt to consume a token from the rate limiter.
  //
  // When `onExceeded` is set to "delay", the effect will return the time to
  // wait for the token to become available.
  const consume = limiter.consume({
    algorithm: "token-bucket",
    onExceeded: "delay",
    window: "10 seconds",
    limit: 5,
    key: "user-123"
  })

  // `consume` returns the metadata about the rate limiting operation.
  //
  // ```
  // {
  //   delay: { _id: 'Duration', _tag: 'Millis', millis: 0 },
  //   limit: 5,
  //   remaining: 4,
  //   resetAfter: { _id: 'Duration', _tag: 'Millis', millis: 2000 }
  // }
  // ```
  console.log(yield* consume)

  // If `onExceeded` is set to "fail", the effect will fail with a
  // RateLimiter.RateLimitExceeded error when the limit is exceeded.
  yield* limiter.consume({
    algorithm: "token-bucket",
    onExceeded: "fail",
    window: "10 seconds",
    limit: 5,
    key: "user-123"
  })

  // You can also use `RateLimiter.makeWithRateLimiter` to access a function
  // that applies rate limiting to an effect.
  const withRateLimiter = yield* RateLimiter.makeWithRateLimiter

  yield* Effect.log("Attempting rate limited operation").pipe(
    withRateLimiter({
      algorithm: "token-bucket",
      onExceeded: "delay",
      window: "10 seconds",
      limit: 5,
      key: "user-123"
    })
  )
}).pipe(
  Effect.provide(RateLimiterLayer),
  NodeRuntime.runMain
)
