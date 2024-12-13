---
"@effect/platform": patch
"effect": patch
---

JSONSchema: use `{ "type": "null" }` to represent the `null` literal

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "type": "string"
    },
    {
      "enum": [
        null
      ]
    }
  ]
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "type": "string"
    },
    {
      "type": "null"
    }
  ]
}
*/
```
