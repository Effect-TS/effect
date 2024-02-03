---
"effect": patch
---

Add `Ratelimiter` which limits the number of calls to a resource within a time window using the token bucket algorithm.

Usage Example:

```ts
import { Effect, RateLimiter } from "effect";

// we need a scope because the rate limiter needs to allocate a state and a background job
const program = Effect.scoped(
  Effect.gen(function* ($) {
    // create a rate limiter that executes up to 10 requests within 2 seconds
    const rateLimit = yield* $(RateLimiter.make(10, "2 seconds"));
    // simulate repeated calls
    for (let n = 0; n < 100; n++) {
      // wrap the effect we want to limit with rateLimit
      yield* $(rateLimit(Effect.log("Calling RateLimited Effect")));
    }
  })
);

// will print 10 calls immediately and then throttle
program.pipe(Effect.runFork);
```

Or, in a more real world scenario, with a dedicated Service + Layer:

```ts
import { Context, Effect, Layer, RateLimiter } from "effect";

class ApiLimiter extends Context.Tag("@services/ApiLimiter")<
  ApiLimiter,
  RateLimiter.RateLimiter
>() {
  static Live = RateLimiter.make(10, "2 seconds").pipe(
    Layer.scoped(ApiLimiter)
  );
}

const program = Effect.gen(function* ($) {
  const rateLimit = yield* $(ApiLimiter);
  for (let n = 0; n < 100; n++) {
    yield* $(rateLimit(Effect.log("Calling RateLimited Effect")));
  }
});

program.pipe(Effect.provide(ApiLimiter.Live), Effect.runFork);
```
