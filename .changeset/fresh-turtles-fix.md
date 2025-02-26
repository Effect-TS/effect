---
"effect": patch
---

Schema: More Accurate Return Type for `parseNumber`.

**Before**

```ts
import { Schema } from "effect"

const schema = Schema.parseNumber(Schema.String)

//      ┌─── Schema<string>
//      ▼
schema.from
```

**After**

```ts
import { Schema } from "effect"

const schema = Schema.parseNumber(Schema.String)

//      ┌─── typeof Schema.String
//      ▼
schema.from
```
