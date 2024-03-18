---
"@effect/schema": patch
---

make `optional` dual:

```ts
import * as S from "@effect/schema/Schema";

const schema = S.struct({
  a: S.string.pipe(S.optional()),
});

// same as:
const schema2 = S.struct({
  a: S.optional(S.string),
});
```
