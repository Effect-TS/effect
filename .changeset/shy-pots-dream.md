---
"effect": patch
---

Schema: `standardSchemaV1` now includes the schema, closes #4494.

This update fixes an issue where passing `Schema.standardSchemaV1(...)` directly to `JSONSchema.make` would throw a `TypeError`. The schema was missing from the returned object, causing the JSON schema generation to fail.

Now `standardSchemaV1` includes the schema itself, so it can be used with `JSONSchema.make` without issues.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const Person = Schema.Struct({
  name: Schema.optionalWith(Schema.NonEmptyString, { exact: true })
})

const standardSchema = Schema.standardSchemaV1(Person)

console.log(JSONSchema.make(standardSchema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  '$defs': {
    NonEmptyString: {
      type: 'string',
      description: 'a non empty string',
      title: 'nonEmptyString',
      minLength: 1
    }
  },
  type: 'object',
  required: [],
  properties: { name: { '$ref': '#/$defs/NonEmptyString' } },
  additionalProperties: false
}
*/
```
