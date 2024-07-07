---
"effect": minor
---

add RcRef module

An `RcRef` wraps a reference counted resource that can be acquired and released multiple times.

The resource is lazily acquired on the first call to `get` and released when the last reference is released.

```ts
import { Effect, RcRef } from "effect";

Effect.gen(function* () {
  const ref = yield* RcRef.make({
    acquire: Effect.acquireRelease(Effect.succeed("foo"), () =>
      Effect.log("release foo"),
    ),
  });

  // will only acquire the resource once, and release it
  // when the scope is closed
  yield* RcRef.get(ref).pipe(Effect.andThen(RcRef.get(ref)), Effect.scoped);
});
```
