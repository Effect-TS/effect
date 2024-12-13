---
"@effect/platform": patch
"effect": patch
---

add `type` for homogeneous enum schemas, closes #4127

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Literal("a", "b")

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "enum": [
    "a",
    "b"
  ]
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Literal("a", "b")

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "enum": [
    "a",
    "b"
  ]
}
*/
```
