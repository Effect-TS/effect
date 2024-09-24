---
"@effect/platform": patch
"@effect/schema": patch
---

Remove default json schema annotations from string, number and boolean.

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.String.annotations({ examples: ["a", "b"] })

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a string",
  "title": "string",
  "examples": [
    "a",
    "b"
  ]
}
*/
```

After

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.String.annotations({ examples: ["a", "b"] })

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "examples": [
    "a",
    "b"
  ]
}
*/
```
