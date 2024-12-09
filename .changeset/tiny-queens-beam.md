---
"effect": patch
---

JSONSchema: Fix issue where `identifier` is ignored when a refinement is applied to a schema, closes #4012

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NonEmptyString

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a non empty string",
  "title": "NonEmptyString",
  "minLength": 1
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NonEmptyString

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$ref": "#/$defs/NonEmptyString",
  "$defs": {
    "NonEmptyString": {
      "type": "string",
      "description": "a non empty string",
      "title": "NonEmptyString",
      "minLength": 1
    }
  }
}
*/
```
