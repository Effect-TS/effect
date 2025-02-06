---
"effect": patch
---

Support unions in unify:

```ts
import type { Option, Unify } from "effect"

export type X = Unify.Unify<Option.Option<number> | Option.Option<string>>
```

The above would previously be `Some<number | string> | None<number | string>`, with this change it becomes `Option<number | string>`
