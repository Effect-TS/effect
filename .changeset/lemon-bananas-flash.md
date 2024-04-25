---
"effect": minor
---

add Effect.scopedAsDisposable, for integrating Scope with the `using` keyword

This can be used for scoping resources to a function scope.

```ts
import { Effect } from "effect"

Effect.gen(function* () {
  using foo = yield* Effect.scopedAsDisposable(
    Effect.acquireRelease(Effect.succeed("foo"), () =>
      Effect.log("release foo")
    )
  )
  yield* Effect.log(`acquired foo: ${foo.value}`)

  // "release foo" will now be logged
})
```
