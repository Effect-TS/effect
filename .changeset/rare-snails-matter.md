---
"effect": minor
---

Add Either.forEach

```ts
import { Either } from "effect"

Either.forEach([1, 2], n => Either.right(n * 2)) // => Either.right([2, 4])
Either.forEach([1, 2], n => n === 1 ? Either.left("error") : Either.right(1)) // => Either.left("error")
```
