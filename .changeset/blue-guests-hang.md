---
"@effect/platform": patch
"effect": patch
---

add support for `Schema.OptionFromUndefinedOr` in JSON Schema generation, closes #3839

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.OptionFromUndefinedOr(Schema.Number)
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
throws:
Error: Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.OptionFromUndefinedOr(Schema.Number)
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [],
  "properties": {
    "a": {
      "type": "number"
    }
  },
  "additionalProperties": false
}
*/
```
