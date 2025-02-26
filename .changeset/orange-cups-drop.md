---
"effect": patch
---

Refactor `JSONSchema` to use `additionalProperties` instead of `patternProperties` for simple records, closes #4518.

This update improves how records are represented in JSON Schema by replacing `patternProperties` with `additionalProperties`, resolving issues in OpenAPI schema generation.

**Why the change?**

- **Fixes OpenAPI issues** – Previously, records were represented using `patternProperties`, which caused problems with OpenAPI tools.
- **Better schema compatibility** – Some tools, like `openapi-ts`, struggled with `patternProperties`, generating `Record<string, never>` instead of the correct type.
- **Fixes missing example values** – When using `patternProperties`, OpenAPI failed to generate proper response examples, displaying only `{}`.
- **Simplifies schema modification** – Users previously had to manually fix schemas with `OpenApi.Transform`, which was messy and lacked type safety.

**Before**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Record({ key: Schema.String, value: Schema.Number })

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [],
  "properties": {},
  "patternProperties": {
    "": { // ❌ Empty string pattern
      "type": "number"
    }
  }
}
*/
```

**After**

Now, `additionalProperties` is used instead, which properly represents an open-ended record:

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Record({ key: Schema.String, value: Schema.Number })

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [],
  "properties": {},
  "additionalProperties": { // ✅ Represents unrestricted record keys
    "type": "number"
  }
}
*/
```
