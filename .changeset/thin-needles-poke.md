---
"effect": patch
---

Add support for refinements to `Schema.omit`, closes #4603.

Before

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.String,
  b: Schema.String
})

const omitted = schema.pipe(
  Schema.filter(() => true),
  Schema.omit("a")
)

console.log(String(omitted.ast))
// {} ❌
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.String,
  b: Schema.String
})

const omitted = schema.pipe(
  Schema.filter(() => true),
  Schema.omit("a")
)

console.log(String(omitted.ast))
// { readonly b: string }
```
