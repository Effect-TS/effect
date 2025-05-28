---
"effect": minor
---

Add HashMap.countBy

```ts
import { HashMap } from "effect"

const map = HashMap.make([1, "a"], [2, "b"], [3, "c"])
const result = HashMap.countBy(map, (_v, key) => key % 2 === 1)
console.log(result) // 2
```
