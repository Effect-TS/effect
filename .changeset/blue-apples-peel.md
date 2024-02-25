---
"@effect/schema": minor
---

replace `propertySignatureAnnotations` with `asPropertySignature`, add `annotations` method to `PropertySignature` and
remove all `annotations` parameters to PropertySignature APIs (use the `annotations` method instead)

Before

```ts
S.string.pipe(S.propertySignatureAnnotations({ description: "description" }));

S.optional(S.string, {
  exact: true,
  annotations: { description: "description" },
});
```

Now

```ts
S.asPropertySignature(S.string).annotations({ description: "description" });

S.optional(S.string, { exact: true }).annotations({
  description: "description",
});
```
