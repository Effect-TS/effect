---
"@effect/schema": patch
---

JSON Schema: change default behavior for property signatures containing `undefined`

Changed the default behavior when encountering a required property signature whose type contains `undefined`. Instead of raising an exception, `undefined` is now pruned and **the field is set as optional**.

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.NullishOr(Schema.Number)
})

const jsonSchema = JSONSchema.make(schema)
console.log(JSON.stringify(jsonSchema, null, 2))
/*
throws
Error: Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined
*/
```

Now

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.NullishOr(Schema.Number)
})

const jsonSchema = JSONSchema.make(schema)
console.log(JSON.stringify(jsonSchema, null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [], // <=== empty
  "properties": {
    "a": {
      "anyOf": [
        {
          "type": "number"
        },
        {
          "$ref": "#/$defs/null"
        }
      ]
    }
  },
  "additionalProperties": false,
  "$defs": {
    "null": {
      "const": null
    }
  }
}
*/
```
