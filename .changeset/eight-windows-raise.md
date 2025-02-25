---
"effect": patch
---

Schema: More Accurate Return Types for `ArrayEnsure` and `NonEmptyArrayEnsure`.

**Before**

```ts
import { Schema } from "effect"

const schema1 = Schema.ArrayEnsure(Schema.String)

// @ts-expect-error: Property 'from' does not exist
schema1.from

const schema2 = Schema.NonEmptyArrayEnsure(Schema.String)

// @ts-expect-error: Property 'from' does not exist
schema2.from
```

**After**

```ts
import { Schema } from "effect"

const schema1 = Schema.ArrayEnsure(Schema.String)

//        ┌─── Schema.Union<[typeof Schema.String, Schema.Array$<typeof Schema.String>]>
//        ▼
schema1.from

const schema2 = Schema.NonEmptyArrayEnsure(Schema.String)

//        ┌─── Schema.Union<[typeof Schema.String, Schema.NonEmptyArray<typeof Schema.String>]>
//        ▼
schema2.from
```
