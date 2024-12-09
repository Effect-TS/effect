---
"effect": patch
---

JSONSchema: Correct the output order when generating a JSON Schema from a Union that includes literals and primitive schemas.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Union(Schema.Literal(1, 2), Schema.String)

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
        1,
        2
      ]
    }
  ]
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Union(Schema.Literal(1, 2), Schema.String)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "enum": [
        1,
        2
      ]
    },
    {
      "type": "string"
    }
  ]
}
*/
```
