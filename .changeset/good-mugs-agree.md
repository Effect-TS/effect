---
"@effect/platform": patch
"effect": patch
---

JSONSchema: merge refinement fragments instead of just overwriting them.

Before

```ts
import { JSONSchema, Schema } from "effect"

export const schema = Schema.String.pipe(
  Schema.startsWith("a"), // <= overwritten!
  Schema.endsWith("c")
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a string ending with \"c\"",
  "pattern": "^.*c$" // <= overwritten!
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

export const schema = Schema.String.pipe(
  Schema.startsWith("a"), // <= preserved!
  Schema.endsWith("c")
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "type": "string",
  "description": "a string ending with \"c\"",
  "pattern": "^.*c$",
  "allOf": [
    {
      "pattern": "^a" // <= preserved!
    }
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
*/
```
