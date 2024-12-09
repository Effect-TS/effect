---
"effect": patch
---

Schema: fix `withDecodingDefault` and `withDefaults` signatures by removing `Exclude<Type, undefined>` in the return type.

Before

```ts
import { Schema } from "effect"

const schema1 = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withConstructorDefault(() => undefined) // ok
  )
})

console.log(schema1.make({}))
// Output: { a: undefined }

const schema2 = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withDecodingDefault(() => ""),
    Schema.withConstructorDefault(() => undefined) // Type Error: Type 'undefined' is not assignable to type 'string'.ts(2322)
  )
})
```

After

```ts
import { Schema } from "effect"

const schema1 = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withConstructorDefault(() => undefined) // ok
  )
})

console.log(schema1.make({}))
// Output: { a: undefined }

const schema2 = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withDecodingDefault(() => ""),
    Schema.withConstructorDefault(() => undefined) // ok
  )
})

console.log(schema2.make({}))
// Output: { a: undefined }
```
