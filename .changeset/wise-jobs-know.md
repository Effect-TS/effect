---
"effect": patch
---

Schema: fix `withDecodingDefault` and `withDefaults` signatures by removing `Exclude<Type, undefined>`.

Before

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.String.pipe(
    Schema.optional,
    Schema.withDecodingDefault(() => ""),
    Schema.withConstructorDefault(() => undefined) // Type Error: Type 'undefined' is not assignable to type 'string'.ts(2322)
  )
})
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.String.pipe(
    Schema.optional,
    Schema.withDecodingDefault(() => ""),
    Schema.withConstructorDefault(() => undefined)
  )
})

console.log(schema.make())
// Output: { a: undefined }
```
