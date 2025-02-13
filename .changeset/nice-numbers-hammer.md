---
"effect": patch
---

Preserve function `length` property in `Effect.fn` / `Effect.fnUntraced`, closes #4435

Previously, functions created with `Effect.fn` and `Effect.fnUntraced` always had a `.length` of `0`, regardless of their actual number of parameters. This has been fixed so that the `length` property correctly reflects the expected number of arguments.

**Before**

```ts
import { Effect } from "effect"

const fn1 = Effect.fn("fn1")(function* (n: number) {
  return n
})

console.log(fn1.length)
// Output: 0 ❌ (incorrect)

const fn2 = Effect.fnUntraced(function* (n: number) {
  return n
})

console.log(fn2.length)
// Output: 0 ❌ (incorrect)
```

**After**

```ts
import { Effect } from "effect"

const fn1 = Effect.fn("fn1")(function* (n: number) {
  return n
})

console.log(fn1.length)
// Output: 1 ✅ (correct)

const fn2 = Effect.fnUntraced(function* (n: number) {
  return n
})

console.log(fn2.length)
// Output: 1 ✅ (correct)
```
