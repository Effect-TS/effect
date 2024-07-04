---
"@effect/schema": patch
---

Add `pick` and `omit` static functions to `Struct` interface, closes #3152.

**pick**

The `pick` static function available in each struct schema can be used to create a new `Struct` by selecting particular properties from an existing `Struct`.

```ts
import { Schema } from "@effect/schema"

const MyStruct = Schema.Struct({
  a: Schema.String,
  b: Schema.Number,
  c: Schema.Boolean
})

// Schema.Struct<{ a: typeof Schema.String; c: typeof Schema.Boolean; }>
const PickedSchema = MyStruct.pick("a", "c")
```

**omit**

The `omit` static function available in each struct schema can be used to create a new `Struct` by excluding particular properties from an existing `Struct`.

```ts
import { Schema } from "@effect/schema"

const MyStruct = Schema.Struct({
  a: Schema.String,
  b: Schema.Number,
  c: Schema.Boolean
})

// Schema.Struct<{ a: typeof Schema.String; c: typeof Schema.Boolean; }>
const PickedSchema = MyStruct.omit("b")
```
