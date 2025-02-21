---
"effect": patch
---

Schema: more precise return types when filters are involved.

- `maxLength`

**Example** (with `Schema.maxLength`)

Before

```ts
import { Schema } from "effect"

//      ┌─── Schema.filter<Schema.Schema<string, string, never>>
//      ▼
const schema = Schema.String.pipe(Schema.maxLength(10))

// Schema<string, string, never>
schema.from
```

After

```ts
import { Schema } from "effect"

//      ┌─── Schema.filter<typeof Schema.String>
//      ▼
const schema = Schema.String.pipe(Schema.maxLength(10))

// typeof Schema.String
schema.from
```
