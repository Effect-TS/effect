---
"effect": patch
---

Schema: Add Missing `declare` API Interface to Expose Type Parameters.

**Example**

```ts
import { Schema } from "effect"

const schema = Schema.OptionFromSelf(Schema.String)

//       ┌─── readonly [typeof Schema.String]
//       ▼
schema.typeParameters
```
