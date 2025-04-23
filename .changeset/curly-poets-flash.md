---
"effect": patch
---

JSONSchema: apply `encodeOption` to each example and retain successful results.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.BigInt).annotations({ examples: [1n, 2n] })
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "BigInt": {
      "type": "string",
      "description": "a string to be decoded into a bigint"
    }
  },
  "type": "object",
  "required": [
    "a"
  ],
  "properties": {
    "a": {
      "$ref": "#/$defs/BigInt",
      "examples": [
        "1",
        "2"
      ]
    }
  },
  "additionalProperties": false
}
*/
```
