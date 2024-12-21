---
"effect": patch
---

Schema: Fix `withDecodingDefault` implementation to align with its signature (now removes `undefined` from the AST).

Additionally, a new constraint has been added to the signature to prevent calling `withDecodingDefault` after `withConstructorDefault`, which previously led to the following issue:

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withConstructorDefault(() => undefined), // this is invalidated by the following call to `withDecodingDefault`
    Schema.withDecodingDefault(() => "")
  )
})
```
