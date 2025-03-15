---
"effect": patch
---

Fix issue with generic filters when generating arbitraries, closes #4605.

Previously, applying a `filter` to a schema when generating arbitraries could cause a `TypeError` due to missing properties. This fix ensures that arbitraries are generated correctly when filters are used.

**Before**

```ts
import { Arbitrary, Schema } from "effect"

const schema = Schema.BigIntFromSelf.pipe(Schema.filter(() => true))

Arbitrary.make(schema)
// TypeError: Cannot read properties of undefined (reading 'min')
```

**After**

```ts
import { Arbitrary, Schema } from "effect"

const schema = Schema.BigIntFromSelf.pipe(Schema.filter(() => true))

const result = Arbitrary.make(schema) // Works correctly
```
