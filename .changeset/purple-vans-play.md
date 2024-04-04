---
"@effect/schema": patch
---

`length` now allows expressing a range

Example

```ts
import * as S from "@effect/schema/Schema";

const schema = S.string.pipe(
  S.length({ min: 2, max: 4 }, { identifier: "MyRange" })
);

S.decodeUnknownSync(schema)("");
/*
throws:
Error: MyRange
└─ Predicate refinement failure
   └─ Expected MyRange (a string at least 2 character(s) and at most 4 character(s) long), actual ""
*/
```
