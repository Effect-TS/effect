---
"@effect/schema": patch
---

Fix: Correct Handling of JSON Schema Annotations in Refinements

Fixes an issue where the JSON schema annotation set by a refinement after a transformation was mistakenly interpreted as an override annotation. This caused the output to be incorrect, as the annotations were not applied as intended.

Before

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Trim.pipe(Schema.nonEmpty())

const jsonSchema = JSONSchema.make(schema)
console.log(JSON.stringify(jsonSchema, null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "minLength": 1
}
*/
```

Now

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Trim.pipe(Schema.nonEmpty())

const jsonSchema = JSONSchema.make(schema)
console.log(JSON.stringify(jsonSchema, null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
*/
```
