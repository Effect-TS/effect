---
"effect": minor
---

add RcMap module

An `RcMap` can contain multiple reference counted resources that can be indexed
by a key. The resources are lazily acquired on the first call to `get` and
released when the last reference is released.

Complex keys can extend `Equal` and `Hash` to allow lookups by value.

```ts
import { Effect, RcMap } from "effect";

Effect.gen(function* () {
  const map = yield* RcMap.make({
    lookup: (key: string) =>
      Effect.acquireRelease(Effect.succeed(`acquired ${key}`), () =>
        Effect.log(`releasing ${key}`),
      ),
  });

  // Get "foo" from the map twice, which will only acquire it once
  // It will then be released once the scope closes.
  yield* RcMap.get(map, "foo").pipe(
    Effect.andThen(RcMap.get(map, "foo")),
    Effect.scoped,
  );
});
```
