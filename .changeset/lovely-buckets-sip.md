---
"effect": minor
---

Implement Struct.keys as a typed alternative to Object.keys

```ts
import { Struct } from "effect"

const symbol: unique symbol = Symbol()

const value = {
  a: 1,
  b: 2,
  [symbol]: 3
}

const keys: Array<"a" | "b"> = Struct.keys(value)
```
