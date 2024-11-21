---
"effect": patch
---

Stable filters such as `minItems`, `maxItems`, and `itemsCount` should be applied only if the from part fails with a `Composite` issue, closes #3980

Before

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.Array(Schema.String).pipe(Schema.minItems(1))
})

Schema.decodeUnknownSync(schema)({}, { errors: "all" })
// throws: TypeError: Cannot read properties of undefined (reading 'length')
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.Array(Schema.String).pipe(Schema.minItems(1))
})

Schema.decodeUnknownSync(schema)({}, { errors: "all" })
/*
throws:
ParseError: { readonly a: an array of at least 1 items }
└─ ["a"]
   └─ is missing
*/
```
