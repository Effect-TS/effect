---
"effect": patch
---

Schema: update `pluck` type signature to respect optional fields.

**Before**

```ts
import { Schema } from "effect"

const schema1 = Schema.Struct({ a: Schema.optional(Schema.String) })

/*
const schema2: Schema.Schema<string | undefined, {
    readonly a: string | undefined;
}, never>
*/
const schema2 = Schema.pluck(schema1, "a")
```

**After**

```ts
import { Schema } from "effect"

const schema1 = Schema.Struct({ a: Schema.optional(Schema.String) })

/*
const schema2: Schema.Schema<string | undefined, {
    readonly a?: string | undefined;
}, never>
*/
const schema2 = Schema.pluck(schema1, "a")
```
