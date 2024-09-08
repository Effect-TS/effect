---
"effect": minor
---

The `Deferred<A>` is now a subtype of `Effect<A>`. This change simplifies handling of deferred values, removing the need for explicit call `Deffer.await`.

```typescript
import { Effect, Deferred } from "effect"

Effect.gen(function* () {
  const deferred = yield* Deferred.make<string>()

  const before = yield* Deferred.await(deferred)
  const after = yield* deferred
})
```
