---
"effect": patch
---

Schema: More Accurate Return Types for `DataFromSelf` and `Data`.

This update refines the return types of `DataFromSelf` and `Data`, making them clearer and more specific, especially when working with structured schemas.

**Before**

The return types were more generic, making it harder to see the underlying structure:

```ts
import { Schema } from "effect"

const struct = Schema.Struct({ a: Schema.NumberFromString })

//       ┌─── Schema.DataFromSelf<Schema<{ readonly a: number; }, { readonly a: string; }>>
//       ▼
const schema1 = Schema.DataFromSelf(struct)

//       ┌─── Schema.Data<Schema<{ readonly a: number; }, { readonly a: string; }>>
//       ▼
const schema2 = Schema.Data(struct)
```

**After**

Now, the return types clearly reflect the original schema structure:

```ts
import { Schema } from "effect"

const struct = Schema.Struct({ a: Schema.NumberFromString })

//       ┌─── Schema.DataFromSelf<Schema.Struct<{ a: typeof Schema.NumberFromString; }>>
//       ▼
const schema1 = Schema.DataFromSelf(struct)

//       ┌─── Schema.Data<Schema.Struct<{ a: typeof Schema.NumberFromString; }>>
//       ▼
const schema2 = Schema.Data(struct)
```
