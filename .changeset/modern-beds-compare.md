---
"effect": patch
---

Fix the behavior of `Schema.TemplateLiteralParser` when the arguments include literals other than string literals.

Before

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser(Schema.String, 1)

console.log(Schema.decodeUnknownSync(schema)("a1"))
/*
throws
ParseError: (`${string}1` <-> readonly [string, 1])
└─ Type side transformation failure
   └─ readonly [string, 1]
      └─ [1]
         └─ Expected 1, actual "1"
*/
```

After

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser(Schema.String, 1)

console.log(Schema.decodeUnknownSync(schema)("a1"))
// Output: [ 'a', 1 ]
```
