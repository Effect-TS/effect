---
"@effect/schema": patch
---

make `partial` dual:

```ts
import * as S from "@effect/schema/Schema";

const schema = S.struct({ a: S.string }).pipe(S.partial());

// same as:
const schema2 = S.partial(S.struct({ a: S.string }));
```
