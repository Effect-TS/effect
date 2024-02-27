---
"@effect/schema": patch
---

Add `pickLiteral` to Schema so that we can pick values from a Schema literal as follows:

```ts
import * as S from "@effect/schema/Schema";

const schema = S.literal("a", "b", "c").pipe(S.pickLiteral("a", "b")); // same as S.literal("a", "b")

S.decodeUnknownSync(schema)("a"); // ok
S.decodeUnknownSync(schema)("b"); // ok
S.decodeUnknownSync(schema)("c");
/*
Error: "a" | "b"
├─ Union member
│  └─ Expected "a", actual "c"
└─ Union member
   └─ Expected "b", actual "c"
*/
```
