---
"effect": patch
---

Add support for `jsonSchema` annotations on `SymbolFromSelf` index signatures.

**Before**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Record({
  key: Schema.SymbolFromSelf.annotations({ jsonSchema: { type: "string" } }),
  value: Schema.Number
})

JSONSchema.make(schema)
/*
throws:
Error: Unsupported index signature parameter
schema (SymbolKeyword): symbol
*/
```

**After**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Record({
  key: Schema.SymbolFromSelf.annotations({ jsonSchema: { type: "string" } }),
  value: Schema.Number
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [],
  "properties": {},
  "additionalProperties": {
    "type": "number"
  },
  "propertyNames": {
    "type": "string"
  }
}
*/
```
