---
"@effect/schema": patch
---

add `BatchingAnnotation`, default value: `false`

Example:

```ts
const schema = S.struct({
  a: S.string,
  b: S.number,
}).pipe(S.batching(true /* boolean | "inherit" | undefined */));
```
