---
"@effect/experimental": patch
"effect": patch
---

add Readable module / trait

`Readable` is a common interface for objects that can be read from using a `get`
Effect.

For example, `Ref`'s implement `Readable`:

```ts
import { Effect, Readable, Ref } from "effect";
import assert from "assert";

Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(123));
  assert(Readable.isReadable(ref));

  const result = yield* _(ref.get);
  assert(result === 123);
});
```
