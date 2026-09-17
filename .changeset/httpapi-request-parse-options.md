---
"effect": patch
---

Add `parseOptions` to `HttpApiBuilder` handler options, so the parse options used when decoding request parts can be configured. This makes it possible to collect every decoding error instead of only the first one.

```ts
HttpApiBuilder.group(
  Api,
  "users",
  (handlers) => handlers.handle("create", handler, { parseOptions: { errors: "all" } })
)
```

The option applies to `params`, `headers`, `query`, and `payload` decoding, both in `HttpApiBuilder.group` and `HttpApiBuilder.endpoint`.
