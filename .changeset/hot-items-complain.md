---
"@effect/schema": patch
---

Schema: JSONSchema should support make(Class)

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

class A extends Schema.Class<A>("A")({
  a: Schema.String
}) {}

console.log(JSONSchema.make(A)) // throws MissingAnnotation: cannot build a JSON Schema for a declaration without a JSON Schema annotation
```

Now

```ts
console.log(JSONSchema.make(A))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [ 'a' ],
  properties: { a: { type: 'string', description: 'a string', title: 'string' } },
  additionalProperties: false
}
*/
```
