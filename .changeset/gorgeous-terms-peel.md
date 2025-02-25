---
"effect": patch
---

Schema: add missing `from` property to `brand` interface.

Before

```ts
import { Schema } from "effect"

const schema = Schema.String.pipe(Schema.brand("my-brand"))

// @ts-expect-error: Property 'from' does not exist
schema.from
```

After

```ts
import { Schema } from "effect"

const schema = Schema.String.pipe(Schema.brand("my-brand"))

//      ┌─── typeof Schema.String
//      ▼
schema.from
```
