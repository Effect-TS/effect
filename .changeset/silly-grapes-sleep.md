---
"@effect/platform": patch
"@effect/schema": patch
---

JSON Schema: handle refinements where the 'from' part includes a transformation, closes #3662

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Date

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
throws
Error: Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Refinement): Date
*/
```

After

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Date

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a string that will be parsed into a Date"
}
*/
```
