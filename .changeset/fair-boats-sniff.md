---
"@effect/schema": patch
---

Introducing Optional Annotations in `optional` API.

Previously, when adding annotations to an optional field using `optional` API, you needed to use `propertySignatureAnnotations`. However, a new optional argument `annotations` is now available to simplify this process.

Before:

```ts
import * as S from "@effect/schema/Schema";

const myschema = S.struct({
  a: S.optional(S.string).pipe(
    S.propertySignatureAnnotations({ description: "my description..." })
  ),
});
```

Now:

```ts
import * as S from "@effect/schema/Schema";

const myschema = S.struct({
  a: S.optional(S.string, {
    annotations: { description: "my description..." },
  }),
});
```

With this update, you can easily include annotations directly within the `optional` API without the need for additional calls.
