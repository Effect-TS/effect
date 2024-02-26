---
"effect": patch
---

Default `batching` to `"inherit"` if not specified in `Effect.forEach`

With this change, the following:

```ts
Effect.forEach([1, 2, 3], myRequest)
```

is equivalent to:

```ts
Effect.forEach([1, 2, 3], myRequest, { batching: "inherit" })
```

Previously, it would have been equivalent to:

```ts
Effect.forEach([1, 2, 3], myRequest, { batching: false })
```
