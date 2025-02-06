---
"effect": patch
---

Enhance `TagClass` and `ReferenceClass` to enforce `key` type narrowing, closes #4409.

The `key` property in `TagClass` and `ReferenceClass` now correctly retains its specific string value, just like in `Effect.Service`

```ts
import { Context, Effect } from "effect"

// -------------------------------------------------------------------------------------
// `key` field
// -------------------------------------------------------------------------------------

class A extends Effect.Service<A>()("A", { succeed: { a: "value" } }) {}

// $ExpectType "A"
A.key

class B extends Context.Tag("B")<B, { a: "value" }>() {}

// $ExpectType "B"
B.key

class C extends Context.Reference<C>()("C", { defaultValue: () => 0 }) {}

// $ExpectType "C"
C.key
```
