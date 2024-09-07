---
"effect": minor
---

Added `RcMap.keys` and `MutableHashMap.keys`.

These functions allow you to get a list of keys currently stored in the underlying hash map.

```ts
const map = MutableHashMap.make([["a", "a"], ["b", "b"], ["c", "c"]])
const keys = MutableHashMap.keys(map) // ["a", "b", "c"]
```

```ts
Effect.gen(function* () {
  const map = yield* RcMap.make({
    lookup: (key) => Effect.succeed(key)
  })

  yield* RcMap.get(map, "a")
  yield* RcMap.get(map, "b")
  yield* RcMap.get(map, "c")

  const keys = yield* RcMap.keys(map) // ["a", "b", "c"]
})
```
