---
"@effect/platform": minor
---

Update `HttpApi` to remove wildcard support for better OpenAPI compatibility.

The `HttpApi*` modules previously reused the following type from `HttpRouter`:

```ts
type PathInput = `/${string}` | "*"
```

However, the `"*"` wildcard value was not handled correctly, as OpenAPI does not support wildcards.

This has been updated to use a more specific type:

```ts
type PathSegment = `/${string}`
```

This change ensures better alignment with OpenAPI specifications and eliminates potential issues related to unsupported wildcard paths.
