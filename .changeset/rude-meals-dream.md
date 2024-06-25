---
"@effect/schema": patch
---

Special case `S.parseJson` to generate JSON Schemas by targeting the "to" side of transformations, closes #3086

Resolved an issue where `JSONSchema.make` improperly generated JSON Schemas for schemas defined with `S.parseJson(<real schema>)`. Previously, invoking `JSONSchema.make` on these transformed schemas produced a JSON Schema corresponding to a string type rather than the underlying real schema.

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.parseJson(Schema.NumberFromString)
  })
)

console.log(JSONSchema.make(schema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  '$ref': '#/$defs/JsonString',
  '$defs': {
    JsonString: {
      type: 'string',
      description: 'a JSON string',
      title: 'JsonString'
    }
  }
}
*/
```

Now

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.parseJson(Schema.NumberFromString)
  })
)

console.log(JSONSchema.make(schema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [ 'a' ],
  properties: { a: { type: 'string', description: 'a string', title: 'string' } },
  additionalProperties: false
}
*/
```
