---
"effect": minor
---

`Tuple.map` transforms each element of tuple using the given function, treating tuple homomorphically

```ts
import { pipe, Tuple } from "effect"

const result = pipe(
  //  ^? [string, string, string]
  ["a", 1, false] as const,
  T.map((el) => {
    //^? "a" | 1 | false
    return el.toString().toUppercase()
  })
)
assert.deepStrictEqual(result, ["A", "1", "FALSE"])
```
