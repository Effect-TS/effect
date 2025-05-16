---
"effect": minor
---

Add `Iterable.countBy` and `Array.countBy`

```ts
import { Array, Iterable } from "effect"

const resultArray = Array.countBy([1, 2, 3, 4, 5], n => n % 2 === 0)
console.log(resultArray) // 2

const resultIterable = resultIterable.countBy([1, 2, 3, 4, 5], n => n % 2 === 0)
console.log(resultIterable) // 2
```
