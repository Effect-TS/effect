import { Duration, type Effect } from "effect"
import type { RateLimiter } from "effect/unstable/persistence"
import { describe, expect, it } from "tstyche"

describe("RateLimiterStore", () => {
  it("accepts a full window and returns atomic retry and reset timing", () => {
    const store = null as unknown as RateLimiter.RateLimiterStore["Service"]
    const result = store.tokenBucket({
      key: "key",
      tokens: 1,
      limit: 7,
      window: Duration.seconds(1),
      allowOverflow: false
    })
    expect(result).type.toBe<
      Effect.Effect<
        readonly [remaining: number, retryAfterMillis: number, resetAfterMillis: number],
        RateLimiter.RateLimiterError
      >
    >()
  })
})
