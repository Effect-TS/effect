---
"effect": patch
---

JSONSchema: Use identifier with Class APIs to create a `$ref` instead of inlining the schema.

Before

```ts
import { JSONSchema, Schema } from "effect"

class A extends Schema.Class<A>("A")({
  a: Schema.String
}) {}

console.log(JSON.stringify(JSONSchema.make(A), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "a"
  ],
  "properties": {
    "a": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

class A extends Schema.Class<A>("A")({
  a: Schema.String
}) {}

console.log(JSON.stringify(JSONSchema.make(A), null, 2))
/*
{
  "$ref": "#/$defs/A",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "A": {
      "type": "object",
      "required": [
        "a"
      ],
      "properties": {
        "a": {
          "type": "string"
        }
      },
      "additionalProperties": false
    }
  }
}
*/
```
