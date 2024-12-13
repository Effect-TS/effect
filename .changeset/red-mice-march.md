---
"@effect/platform": patch
"effect": patch
---

JSONSchema: handle the `nullable` keyword for OpenAPI target, closes #4075.

Before

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

console.log(JSON.stringify(OpenApiJsonSchema.make(schema), null, 2))
/*
{
  "anyOf": [
    {
      "type": "string"
    },
    {
      "enum": [
        null
      ]
    }
  ]
}
*/
```

After

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

console.log(JSON.stringify(OpenApiJsonSchema.make(schema), null, 2))
/*
{
  "type": "string",
  "nullable": true
}
*/
```
