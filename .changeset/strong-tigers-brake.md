---
"effect": minor
---

Add `Array.countBy`

```ts
import { Array } from "effect"

const result = Array.countBy([1, 2, 3, 4, 5], n => n % 2 === 0)
console.log(result) // 2
```
