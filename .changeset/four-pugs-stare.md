---
"@effect/schema": patch
---

Modified `JSONSchema.make` to selectively ignore the `title` and `description` fields in schema types such as `Schema.String`, `Schema.Number`, and `Schema.Boolean`, closes #3116

Before

```ts
import { JSONSchema, Schema as S } from "@effect/schema"

const schema = S.Struct({
  foo: S.String,
  bar: S.Number
})

console.log(JSONSchema.make(schema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [ 'foo', 'bar' ],
  properties: {
    foo: { type: 'string', description: 'a string', title: 'string' },
    bar: { type: 'number', description: 'a number', title: 'number' }
  },
  additionalProperties: false
}
*/
```

Now

```ts
import { JSONSchema, Schema as S } from "@effect/schema"

const schema = S.Struct({
  foo: S.String,
  bar: S.Number
})

console.log(JSONSchema.make(schema))
/*
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [ 'foo', 'bar' ],
  properties: { foo: { type: 'string' }, bar: { type: 'number' } },
  additionalProperties: false
}
*/
```
