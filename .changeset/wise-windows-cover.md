---
"effect": patch
---

Refactor JSON Schema Generation to Include Transformation Annotations, closes #3016

When generating a JSON Schema, treat `TypeLiteralTransformations` (such as when `Schema.optionalWith` is used) as a special case. Annotations from the transformation itself will now be applied, unless there are user-defined annotations on the form side. This change ensures that the user's intended annotations are properly included in the schema.

**Before**

Annotations set on the transformation are ignored. However while using `Schema.optionalWith` internally generates a transformation schema, this is considered a technical detail. The user's intention is to add annotations to the "struct" schema, not to the transformation.

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optionalWith(Schema.String, { default: () => "" })
}).annotations({
  identifier: "MyID",
  description: "My description",
  title: "My title"
})

console.log(JSONSchema.make(schema))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [],
  properties: { a: { type: 'string' } },
  additionalProperties: false
}
*/
```

**After**

Annotations set on the transformation are now considered during JSON Schema generation:

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optionalWith(Schema.String, { default: () => "" })
}).annotations({
  identifier: "MyID",
  description: "My description",
  title: "My title"
})

console.log(JSONSchema.make(schema))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  '$ref': '#/$defs/MyID',
  '$defs': {
    MyID: {
      type: 'object',
      required: [],
      properties: [Object],
      additionalProperties: false,
      description: 'My description',
      title: 'My title'
    }
  }
}
*/
```
