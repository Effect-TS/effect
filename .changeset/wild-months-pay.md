---
"effect": patch
---

JSONSchema: handle empty native enums.

Before

```ts
import { JSONSchema, Schema } from "effect"

enum Empty {}

const schema = Schema.Enums(Empty)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$comment": "/schemas/enums",
  "anyOf": [] // <= invalid schema!
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

enum Empty {}

const schema = Schema.Enums(Empty)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "/schemas/never",
  "not": {}
}
*/
```
