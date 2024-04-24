---
"effect": patch
---

allow use of generators (Effect.gen) without the adapter

Effect's data types now implement a Iterable that can be `yield*`'ed directly.

```ts
Effect.gen(function* () {
  const a = yield* Effect.success(1)
  const b = yield* Effect.success(2)
  return a + b
})
```
