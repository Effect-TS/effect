---
"effect": patch
---

Schema: Extend Support for Array filters, closes #4269.

Added support for `minItems`, `maxItems`, and `itemsCount` to all schemas where `A` extends `ReadonlyArray`, including `NonEmptyArray`.

**Example**

```ts
import { Schema } from "effect"

// Previously, this would have caused an error
const schema = Schema.NonEmptyArray(Schema.String).pipe(Schema.maxItems(2))
```
