---
"effect": patch
---

Add missing `jsonSchema` annotations to the following filters:

- `lowercased`
- `capitalized`
- `uncapitalized`
- `uppercased`

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.Uppercased
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
throws:
Error: Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Refinement): Uppercased
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Uppercased

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
Output:
{
  "$ref": "#/$defs/Uppercased",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "Uppercased": {
      "type": "string",
      "description": "an uppercase string",
      "title": "Uppercased",
      "pattern": "^[^a-z]*$"
    }
  }
}
*/
```
