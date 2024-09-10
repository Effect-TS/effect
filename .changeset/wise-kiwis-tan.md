---
"effect": minor
---

The `FiberRef<A>` is now a subtype of `Effect<A>`. This change simplifies handling of deferred values, removing the need for explicit call `FiberRef.get`.

```typescript
import { Effect, FiberRef } from "effect"

Effect.gen(function* () {
  const fiberRef = yield* FiberRef.make("value")

  const before = yield* FiberRef.get(fiberRef)
  const after = yield* fiberRef
})
```
