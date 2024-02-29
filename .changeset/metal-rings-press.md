---
"@effect/schema": patch
---

add `ConcurrencyAnnotation`, default value: `undefined` (sequential)

Example:

```ts
const schema = S.struct({
  a: S.string,
  b: S.number,
}).pipe(S.concurrency(1 /* number | "unbounded" | "inherit" | undefined */));
```
