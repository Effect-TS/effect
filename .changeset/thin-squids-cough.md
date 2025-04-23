---
"effect": patch
---

JSONSchema: preserve original key name when using `fromKey` followed by `annotations`, closes #4774.

Before:

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String)
    .pipe(Schema.fromKey("b"))
    .annotations({})
})

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
      "type": "string"
    }
  },
  "additionalProperties": false
}
*/
```

After:

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String)
    .pipe(Schema.fromKey("b"))
    .annotations({})
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
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
*/
```
