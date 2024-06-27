---
"@effect/schema": patch
---

Generate JSON Schemas correctly for a schema created by extending two refinements using the `extend` API, ensuring their JSON Schema annotations are preserved.

Example

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.String
})
  .pipe(Schema.filter(() => true, { jsonSchema: { a: 1 } }))
  .pipe(
    Schema.extend(
      Schema.Struct({
        b: Schema.Number
      }).pipe(Schema.filter(() => true, { jsonSchema: { b: 2 } }))
    )
  )

console.log(JSONSchema.make(schema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [ 'a', 'b' ],
  properties: {
    a: { type: 'string', description: 'a string', title: 'string' },
    b: { type: 'number', description: 'a number', title: 'number' }
  },
  additionalProperties: false,
  b: 2,
  a: 1
}
*/
```
