---
"effect": patch
---

Schema: Support template literals in `Schema.Config`.

**Example**

```ts
import { Schema } from "effect"

// const config: Config<`a${string}`>
const config = Schema.Config(
  "A",
  Schema.TemplateLiteral(Schema.Literal("a"), Schema.String)
)
```
