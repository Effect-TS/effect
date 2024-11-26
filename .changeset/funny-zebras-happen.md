---
"effect": minor
---

Add `Effect.scopedWith` to run an effect that depends on a `Scope`, and then closes the `Scope` after the effect has completed

```ts
import { Effect, Scope } from "effect"

const program: Effect.Effect<void> = Effect.scopedWith((scope) => 
  Effect.acquireRelease(
    Effect.log("Acquiring..."),
    () => Effect.log("Releasing...")
  ).pipe(Scope.extend(scope))
)

Effect.runPromise(program)
// Output:
// timestamp=2024-11-26T16:44:54.158Z level=INFO fiber=#0 message=Acquiring...
// timestamp=2024-11-26T16:44:54.165Z level=INFO fiber=#0 message=Releasing...
```
