---
"effect": patch
---

JSONSchema: ignore never members in unions.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Union(Schema.String, Schema.Never)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "type": "string"
    },
    {
      "$id": "/schemas/never",
      "not": {},
      "title": "never"
    }
  ]
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Union(Schema.String, Schema.Never)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
*/
```
