---
"effect": patch
---

JSONSchema: Fix issue where invalid `default`s were included in the output.

Now they are ignored, similar to invalid `examples`.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NonEmptyString.annotations({
  default: ""
})

const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a non empty string",
  "title": "nonEmptyString",
  "default": "",
  "minLength": 1
}
*/
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NonEmptyString.annotations({
  default: ""
})

const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "a non empty string",
  "title": "nonEmptyString",
  "minLength": 1
}
*/
```
