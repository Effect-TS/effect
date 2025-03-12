---
"effect": patch
---

Schema: export `Field` type.

Useful for creating a type that can be used to add custom constraints to the fields of a struct.

```ts
import { Schema } from "effect"

const f = <Fields extends Record<"a" | "b", Schema.Struct.Field>>(
  schema: Schema.Struct<Fields>
) => {
  return schema.omit("a")
}

//      ┌─── Schema.Struct<{ b: typeof Schema.Number; }>
//      ▼
const result = f(Schema.Struct({ a: Schema.String, b: Schema.Number }))
```
