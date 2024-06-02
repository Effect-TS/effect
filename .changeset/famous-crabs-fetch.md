---
"@effect/schema": patch
---

add support for string literals to `Schema.TemplateLiteral` and `TemplateLiteral` API interface.

Before

```ts
import { Schema } from "@effect/schema"

// `https://${string}.com` | `https://${string}.net`
const MyUrl = Schema.TemplateLiteral(
  Schema.Literal("https://"),
  Schema.String,
  Schema.Literal("."),
  Schema.Literal("com", "net")
)
```

Now

```ts
import { Schema } from "@effect/schema"

// `https://${string}.com` | `https://${string}.net`
const MyUrl = Schema.TemplateLiteral(
  "https://",
  Schema.String,
  ".",
  Schema.Literal("com", "net")
)
```
