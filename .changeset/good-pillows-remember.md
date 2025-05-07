---
"effect": patch
---

JSONSchema: respect annotations on declarations.

Previously, annotations added with `.annotations(...)` on `Schema.declare(...)` were not included in the generated JSON Schema output.

Before

```ts
import { JSONSchema, Schema } from "effect"

class MyType {}

const schema = Schema.declare<MyType>((x) => x instanceof MyType, {
  jsonSchema: {
    type: "my-type"
  }
}).annotations({
  title: "My Title",
  description: "My Description"
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "my-type"
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

class MyType {}

const schema = Schema.declare<MyType>((x) => x instanceof MyType, {
  jsonSchema: {
    type: "my-type"
  }
}).annotations({
  title: "My Title",
  description: "My Description"
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "description": "My Description",
  "title": "My Title",
  "type": "my-type"
}
*/
```
