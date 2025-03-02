---
"effect": patch
---

Schema.extend: add support for Transformation + Struct, closes #4536.

**Example**

Before

```ts
import { Schema } from "effect"

const A = Schema.Struct({
  a: Schema.String
})

const B = Schema.Struct({
  b: Schema.String
})

const C = Schema.Struct({
  c: Schema.String
})

const AB = Schema.transform(A, B, {
  strict: true,
  decode: (a) => ({ b: a.a }),
  encode: (b) => ({ a: b.b })
})

// Transformation + Struct
const schema = Schema.extend(AB, C)
/*
throws:
Error: Unsupported schema or overlapping types
details: cannot extend ({ readonly a: string } <-> { readonly b: string }) with { readonly c: string }
*/
```

After

```ts
import { Schema } from "effect"

const A = Schema.Struct({
  a: Schema.String
})

const B = Schema.Struct({
  b: Schema.String
})

const C = Schema.Struct({
  c: Schema.String
})

const AB = Schema.transform(A, B, {
  strict: true,
  decode: (a) => ({ b: a.a }),
  encode: (b) => ({ a: b.b })
})

// Transformation + Struct
const schema = Schema.extend(AB, C)

console.log(Schema.decodeUnknownSync(schema)({ a: "a", c: "c" }))
// Output: { b: 'a', c: 'c' }

console.log(Schema.encodeSync(schema)({ b: "b", c: "c" }))
// Output: { a: 'b', c: 'c' }
```
