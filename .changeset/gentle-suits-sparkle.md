---
"effect": patch
---

Update `RateLimiter` to support passing in a custom `cost` per effect. This is really useful for API(s) that have a "credit cost" per endpoint.

Usage Example :

```ts
import { Effect, RateLimiter } from "effect";
import { compose } from "effect/Function";

const program = Effect.scoped(
  Effect.gen(function* ($) {
    // Create a rate limiter that has an hourly limit of 1000 credits
    const rateLimiter = yield* $(RateLimiter.make(1000, "1 hours"));
    // Query API costs 1 credit per call ( 1 is the default cost )
    const queryAPIRL = compose(rateLimiter, RateLimiter.withCost(1));
    // Mutation API costs 5 credits per call
    const mutationAPIRL = compose(rateLimiter, RateLimiter.withCost(5));
    // ...
    // Use the pre-defined rate limiters
    yield* $(queryAPIRL(Effect.log("Sample Query")));
    yield* $(mutationAPIRL(Effect.log("Sample Mutation")));

    // Or set a cost on-the-fly
    yield* $(
      rateLimiter(Effect.log("Another query with a different cost")).pipe(
        RateLimiter.withCost(3)
      )
    );
  })
);
```
