---
"effect": patch
---

JSONSchema: fix special case in `parseJson` handling to target the "to" side of the transformation only at the top level.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.parseJson(
      Schema.Struct({
        b: Schema.String
      })
    )
  })
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "a"
  ],
  "properties": {
    "a": {
      "type": "object",
      "required": [
        "b"
      ],
      "properties": {
        "b": {
          "type": "string"
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.parseJson(
      Schema.Struct({
        b: Schema.String
      })
    )
  })
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "type": "object",
  "required": [
    "a"
  ],
  "properties": {
    "a": {
      "type": "string",
      "contentMediaType": "application/json"
    }
  },
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
*/
```
