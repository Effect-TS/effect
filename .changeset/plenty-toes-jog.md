---
"effect": patch
---

allow use of Effect.gen without the adapter

Effect now implements a Iterable that can be `yield*`'ed directly.

```ts
Effect.gen(function* () {
  const a = yield* Effect.success(1)
  const a = yield* Effect.success(2)
  return a + b
})
```
