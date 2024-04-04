---
"@effect/schema": patch
---

Class API: Added default `title` annotation to the encoded side.

Before:

```ts
import * as S from "@effect/schema/Schema";

class MySchema extends S.Class<MySchema>("MySchema")({
  a: S.string,
  b: S.number,
}) {}

S.decodeUnknownSync(MySchema)({}, { errors: "all" });
/*
Error: ({ a: string; b: number } <-> MySchema)
└─ Encoded side transformation failure
   └─ { a: string; b: number }
      ├─ ["a"]
      │  └─ is missing
      └─ ["b"]
         └─ is missing
*/
```

After:

```ts
import * as S from "@effect/schema/Schema";

class MySchema extends S.Class<MySchema>("MySchema")({
  a: S.string,
  b: S.number,
}) {}

S.decodeUnknownSync(MySchema)({}, { errors: "all" });
/*
Error: (MySchema (Encoded side) <-> MySchema)
└─ Encoded side transformation failure
   └─ MySchema (Encoded side)
      ├─ ["a"]
      │  └─ is missing
      └─ ["b"]
         └─ is missing
*/
```
