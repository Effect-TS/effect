---
"effect": patch
---

Schema: Fix bug where calling `withDecodingDefault` after `withConstructorDefault` removed the constructor default.

Before

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optional(Schema.Number).pipe(
    Schema.withConstructorDefault(() => 0),
    Schema.withDecodingDefault(() => 1)
  )
})

console.log(schema.make())
// Output: { a: undefined }

console.log(schema.make({}))
// Output: { a: undefined }
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.optional(Schema.Number).pipe(
    Schema.withConstructorDefault(() => 0),
    Schema.withDecodingDefault(() => 1)
  )
})

console.log(schema.make())
// Output: { a: 0 }

console.log(schema.make({}))
// Output: { a: 0 }
```
