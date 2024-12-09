---
"effect": patch
---

Schema: align the `make` constructor of structs with the behavior of the Class API constructors when all fields have a default.

Before

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.Number).pipe(
    Schema.withConstructorDefault(() => 0)
  )
})

// TypeScript error: Expected 1-2 arguments, but got 0.ts(2554)
console.log(schema.make())
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.Number).pipe(
    Schema.withConstructorDefault(() => 0)
  )
})

console.log(schema.make())
// Output: { a: 0 }
```
