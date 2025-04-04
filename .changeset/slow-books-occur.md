---
"effect": patch
---

Fix JSONSchema generation for record values that include `undefined`, closes #4697.

Before

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.partial(
  Schema.Struct(
    { foo: Schema.Number },
    {
      key: Schema.String,
      value: Schema.Number
    }
  )
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
// throws
```

After

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.partial(
  Schema.Struct(
    { foo: Schema.Number },
    {
      key: Schema.String,
      value: Schema.Number
    }
  )
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [],
  "properties": {
    "foo": {
      "type": "number"
    }
  },
  "additionalProperties": {
    "type": "number"
  }
}
*/
```
