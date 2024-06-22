---
"@effect/schema": patch
---

Fix error message display for composite errors when `overwrite = false`

This commit resolves an issue where the custom message for a struct (or tuple or union) was displayed regardless of whether the validation error was related to the entire struct or just a specific part of it. Previously, users would see the custom error message even when the error only concerned a particular field within the struct and the flag `overwrite` was not set to `true`.

```ts
import { Schema, TreeFormatter } from "@effect/schema"
import { Either } from "effect"

const schema = Schema.Struct({
  a: Schema.String
}).annotations({ message: () => "custom message" })

const res = Schema.decodeUnknownEither(schema)({ a: null })
if (Either.isLeft(res)) {
  console.log(TreeFormatter.formatErrorSync(res.left))
  // before: custom message
  // now: { readonly a: string }
  //      └─ ["a"]
  //         └─ Expected string, actual null
}
```
