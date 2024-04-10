---
"effect": patch
---

Add `Duration.divide` and `Duration.unsafeDivide`.

```ts
import { Duration, Option } from "effect"
import assert from "assert"

assert.deepStrictEqual(Duration.divide("10 seconds", 2), Option.some(Duration.decode("5 seconds")))
assert.deepStrictEqual(Duration.divide("10 seconds", 0), Option.none())
assert.deepStrictEqual(Duration.divide("1 nano", 1.5), Option.none())

assert.deepStrictEqual(Duration.unsafeDivide("10 seconds", 2), Duration.decode("5 seconds"))
assert.deepStrictEqual(Duration.unsafeDivide("10 seconds", 0), Duration.infinity)
assert.throws(() => Duration.unsafeDivide("1 nano", 1.5))
```
