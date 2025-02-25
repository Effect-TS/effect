---
"effect": patch
---

Schema: More Accurate Return Type for `compose`.

**Before**

```ts
import { Schema } from "effect"

//      ┌─── SchemaClass<number | null, string>
//      ▼
const schema = Schema.compose(
  Schema.NumberFromString,
  Schema.NullOr(Schema.Number)
)

// @ts-expect-error: Property 'from' does not exist
schema.from

// @ts-expect-error: Property 'to' does not exist
schema.to
```

**After**

```ts
import { Schema } from "effect"

//      ┌─── transform<typeof Schema.NumberFromString, Schema.NullOr<typeof Schema.Number>>
//      ▼
const schema = Schema.compose(
  Schema.NumberFromString,
  Schema.NullOr(Schema.Number)
)

//      ┌─── typeof Schema.NumberFromString
//      ▼
schema.from

//      ┌─── Schema.NullOr<typeof Schema.Number>
//      ▼
schema.to
```
