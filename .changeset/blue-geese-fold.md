---
"@effect/schema": patch
---

Add default title annotations to both sides of Struct transformations.

This simple addition helps make error messages shorter and more understandable.

Before

```ts
import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
  b: Schema.String,
  c: Schema.String,
  d: Schema.String,
  e: Schema.String,
  f: Schema.String
})

Schema.decodeUnknownSync(schema)({ a: 1 })
/*
throws
Error: ({ a?: string; b: string; c: string; d: string; e: string; f: string } <-> { a: string; b: string; c: string; d: string; e: string; f: string })
└─ Encoded side transformation failure
   └─ { a?: string; b: string; c: string; d: string; e: string; f: string }
      └─ ["a"]
         └─ Expected a string, actual 1
*/
```

Now

```ts
import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
  b: Schema.String,
  c: Schema.String,
  d: Schema.String,
  e: Schema.String,
  f: Schema.String
})

Schema.decodeUnknownSync(schema)({ a: 1 })
/*
throws
Error: (Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ Expected a string, actual 1
*/
```
