---
"@effect/schema": patch
---

Enhanced Error Reporting for Discriminated Union Tuple Schemas, closes #3752

Previously, irrelevant error messages were generated for each member of the union. Now, when a discriminator is present in the input, only the relevant member will trigger an error.

Before

```ts
import * as Schema from "@effect/schema/Schema"

const schema = Schema.Union(
  Schema.Tuple(Schema.Literal("a"), Schema.String),
  Schema.Tuple(Schema.Literal("b"), Schema.Number)
).annotations({ identifier: "MyUnion" })

console.log(Schema.decodeUnknownSync(schema)(["a", 0]))
/*
throws:
ParseError: MyUnion
├─ readonly ["a", string]
│  └─ [1]
│     └─ Expected string, actual 0
└─ readonly ["b", number]
   └─ [0]
      └─ Expected "b", actual "a"
*/
```

After

```ts
import * as Schema from "@effect/schema/Schema"

const schema = Schema.Union(
  Schema.Tuple(Schema.Literal("a"), Schema.String),
  Schema.Tuple(Schema.Literal("b"), Schema.Number)
).annotations({ identifier: "MyUnion" })

console.log(Schema.decodeUnknownSync(schema)(["a", 0]))
/*
throws:
ParseError: MyUnion
└─ readonly ["a", string]
   └─ [1]
      └─ Expected string, actual 0
*/
```
