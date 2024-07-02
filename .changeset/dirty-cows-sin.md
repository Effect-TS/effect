---
"@effect/schema": patch
---

Enhance JSON Schema Support for Refinements in Record Parameters.

Enhanced `JSONSchema.make` to properly support refinements as record parameters. Previously, using refinements with `Schema.Record` resulted in errors when generating JSON schemas.

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Record(
  Schema.String.pipe(Schema.minLength(1)),
  Schema.Number
)

console.log(JSONSchema.make(schema))
/*
throws
Error: Unsupported index signature parameter
schema (Refinement): a string at least 1 character(s) long
*/
```

Now

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Record(
  Schema.String.pipe(Schema.minLength(1)),
  Schema.Number
)

console.log(JSONSchema.make(schema))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [],
  properties: {},
  patternProperties: { '': { type: 'number' } },
  propertyNames: {
    type: 'string',
    description: 'a string at least 1 character(s) long',
    minLength: 1
  }
}
*/
```
