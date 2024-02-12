---
"effect": patch
---

Updates the `RateLimiter.make` constructor to take an object of `RateLimiter.Options`, which allows for specifying the rate-limiting algorithm to utilize:

You can choose from either the `token-bucket` or the `fixed-window` algorithms for rate-limiting.

```ts
export declare namespace RateLimiter {
  export interface Options {
    /**
     * The maximum number of requests that should be allowed.
     */
    readonly limit: number
    /**
     * The interval to utilize for rate-limiting requests. The semantics of the
     * specified `interval` vary depending on the chosen `algorithm`:
     *
     * `token-bucket`: The maximum number of requests will be spread out over
     * the provided interval if no tokens are available.
     *
     * For example, for a `RateLimiter` using the `token-bucket` algorithm with
     * a `limit` of `10` and an `interval` of `1 seconds`, `1` request can be
     * made every `100 millis`.
     *
     * `fixed-window`: The maximum number of requests will be reset during each
     * interval. For example, for a `RateLimiter` using the `fixed-window`
     * algorithm with a `limit` of `10` and an `interval` of `1 seconds`, a
     * maximum of `10` requests can be made each second.
     */
    readonly interval: DurationInput
    /**
     * The algorithm to utilize for rate-limiting requests.
     *
     * Defaults to `token-bucket`.
     */
    readonly algorithm?: "fixed-window" | "token-bucket"
  }
}
```

