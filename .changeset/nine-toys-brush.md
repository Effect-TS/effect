---
"effect": patch
---

Schema: More Accurate Return Type for `parseJson(schema)`.

**Before**

```ts
import { Schema } from "effect"

//      ┌─── Schema.SchemaClass<{ readonly a: number; }, string>
//      ▼
const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.NumberFromString
  })
)

// @ts-expect-error: Property 'to' does not exist
schema.to
```

**After**

```ts
import { Schema } from "effect"

//      ┌─── Schema.transform<Schema.SchemaClass<unknown, string, never>, Schema.Struct<{ a: typeof Schema.NumberFromString; }>>
//      ▼
const schema = Schema.parseJson(
  Schema.Struct({
    a: Schema.NumberFromString
  })
)

//      ┌─── Schema.Struct<{ a: typeof Schema.NumberFromString; }>
//      ▼
schema.to
```
