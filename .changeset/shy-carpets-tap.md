---
"effect": patch
---

Schema: Fix bug in `TemplateLiteralParser` where unions of numeric literals were not coerced correctly.

Before

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser("a", Schema.Literal(1, 2))

console.log(Schema.decodeUnknownSync(schema)("a1"))
/*
throws:
ParseError: (`a${"1" | "2"}` <-> readonly ["a", 1 | 2])
└─ Type side transformation failure
   └─ readonly ["a", 1 | 2]
      └─ [1]
         └─ 1 | 2
            ├─ Expected 1, actual "1"
            └─ Expected 2, actual "1"
*/
```

After

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser("a", Schema.Literal(1, 2))

console.log(Schema.decodeUnknownSync(schema)("a1"))
// Output: [ 'a', 1 ]

console.log(Schema.decodeUnknownSync(schema)("a2"))
// Output: [ 'a', 2 ]

console.log(Schema.decodeUnknownSync(schema)("a3"))
/*
throws:
ParseError: (`a${"1" | "2"}` <-> readonly ["a", 1 | 2])
└─ Encoded side transformation failure
   └─ Expected `a${"1" | "2"}`, actual "a3"
*/
```
