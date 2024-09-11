---
"effect": minor
---

The `Fiber<A, E>` is now a subtype of `Effect<A, E>`. This change removes the need for explicit call `Fiber.join`.

```typescript
import { Effect, Fiber } from "effect"

Effect.gen(function*() {
  const fiber = yield* Effect.fork(Effect.succeed(1))

  const oldWay = yield* Fiber.join(fiber)
  const now = yield* fiber
}))
```
